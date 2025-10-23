import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função para processar vídeo em background
async function processVideoGeneration(operationName: string, actionId: string, teamId: string) {
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    let isDone = false;
    let videoUri = null;
    let attempts = 0;
    const maxAttempts = 60; // 10 minutos (60 tentativas x 5 segundos)

    console.log('Background: Starting video processing for operation:', operationName);

    while (!isDone && attempts < maxAttempts) {
      attempts++;
      console.log(`Background: Polling attempt ${attempts}/${maxAttempts}...`);
      
      await new Promise(resolve => setTimeout(resolve, 5000)); // Verificar a cada 5 segundos
      
      const statusResponse = await fetch(
        `${BASE_URL}/${operationName}`,
        {
          headers: {
            'x-goog-api-key': GEMINI_API_KEY!,
          },
        }
      );

      if (!statusResponse.ok) {
        console.error('Background: Status check failed:', statusResponse.status);
        continue;
      }

      const statusData = await statusResponse.json();
      console.log('Background: Full status data:', JSON.stringify(statusData, null, 2));
      isDone = statusData.done === true;

      // Verificar se a operação falhou
      if (statusData.error || statusData.response?.error) {
        const errorMsg = statusData.error?.message || JSON.stringify(statusData.response?.error);
        console.error('Background: Operation failed with error:', errorMsg);
        throw new Error(`Video generation failed: ${errorMsg}`);
      }

      // Verificar se operação foi cancelada
      if (statusData.metadata?.verb === 'cancel') {
        throw new Error('Video generation was cancelled');
      }

      if (isDone) {
        console.log('Background: ✅ Operation completed!');
        console.log('Background: Full response structure:', JSON.stringify(statusData.response, null, 2));
        
        // Tentar múltiplos caminhos possíveis na resposta
        videoUri = statusData.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri ||
                   statusData.response?.video?.uri ||
                   statusData.response?.generatedSamples?.[0]?.video?.uri ||
                   statusData.response?.result?.video?.uri;
        
        // Se ainda não encontrou, verificar se há erro na resposta
        if (!videoUri && statusData.response?.error) {
          console.error('Background: API returned error:', statusData.response.error);
          throw new Error(`API error: ${JSON.stringify(statusData.response.error)}`);
        }
        
        console.log('Background: Video URI found:', videoUri);
      }
    }

    if (!videoUri) {
      throw new Error(`Video URI not found in response after ${attempts} attempts (${attempts * 5} seconds)`);
    }

    // Download do vídeo
    console.log('Background: Downloading video from:', videoUri);
    const videoResponse = await fetch(videoUri, {
      headers: {
        'x-goog-api-key': GEMINI_API_KEY!,
      },
    });

    if (!videoResponse.ok) {
      throw new Error(`Failed to download video: ${videoResponse.status}`);
    }

    const videoBlob = await videoResponse.blob();
    console.log('Background: Video downloaded, size:', videoBlob.size, 'bytes');
    
    // Para vídeos grandes, armazenar em storage ao invés de base64
    const fileName = `${actionId}_${Date.now()}.mp4`;
    const filePath = `videos/${fileName}`;
    
    // Upload para storage bucket
    const arrayBuffer = await videoBlob.arrayBuffer();
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('videos')
      .upload(filePath, arrayBuffer, {
        contentType: 'video/mp4',
        upsert: true
      });

    if (uploadError) {
      console.error('Background: Error uploading video to storage:', uploadError);
      throw uploadError;
    }

    // Obter URL pública do vídeo
    const { data: publicUrlData } = supabase
      .storage
      .from('videos')
      .getPublicUrl(filePath);
    
    const videoUrl = publicUrlData.publicUrl;
    console.log('Background: Video uploaded to storage:', videoUrl);

    // Decrementar crédito do time após sucesso
    const { error: creditError } = await supabase
      .from('teams')
      .update({
        credits_suggestions: supabase.rpc('decrement', { x: 1, row_id: teamId })
      })
      .eq('id', teamId);

    if (creditError) {
      console.error('Background: Error decrementing credit:', creditError);
    } else {
      console.log('Background: Credit decremented successfully for team:', teamId);
    }

    // Atualizar o action no banco com a URL do vídeo
    const { error: updateError } = await supabase
      .from('actions')
      .update({
        result: { 
          videoUrl,
          processingTime: `${attempts * 5} seconds`,
          attempts: attempts,
          // Metadata do modelo usado
          modelUsed: operationName.includes('veo-3.1') ? 'veo-3.1' : 'veo-3.0',
          audioStyle: Deno.env.get('VIDEO_AUDIO_STYLE') || 'sound_effects',
          visualStyle: Deno.env.get('VIDEO_VISUAL_STYLE') || 'cinematic'
        },
        status: 'completed',
        updated_at: new Date().toISOString()
      })
      .eq('id', actionId);

    if (updateError) {
      console.error('Background: Error updating action:', updateError);
      throw updateError;
    }

    console.log('Background: Video generation completed successfully');
  } catch (error) {
    console.error('Background: Error processing video:', error);
    
    // Atualizar o action com erro
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    await supabase
      .from('actions')
      .update({
        status: 'failed',
        result: { 
          error: error instanceof Error ? error.message : 'Unknown error',
          errorDetails: error instanceof Error ? error.stack : undefined,
          failedAt: new Date().toISOString()
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', actionId);
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'GEMINI_API_KEY não configurada. Configure a chave da API do Gemini.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { 
      prompt, 
      generationType = 'image_to_video',
      referenceImages = [],
      preserveImages = [],
      styleReferenceImages = [],
      actionId,
      includeText = false,
      textContent = "",
      textPosition = "center",
      // PARÂMETROS VEO 3.1
      audioStyle = 'sound_effects',
      visualStyle = 'cinematic',
      aspectRatio = '9:16',
      resolution = '1080p',
      duration = 8,
      negativePrompt = ''
    } = await req.json();
    
    console.log('🎬 Iniciando geração de vídeo com Gemini Veo');
    console.log('🎯 Tipo de geração:', generationType);
    console.log('📝 Prompt:', prompt);
    console.log('🆔 Action ID:', actionId);
    console.log('📝 Incluir texto:', includeText);
    console.log('📝 Conteúdo do texto:', textContent ? `"${textContent}"` : 'Nenhum');
    console.log('📍 Posição do texto:', textPosition);
    console.log('🔊 Áudio:', audioStyle);
    console.log('🎨 Estilo Visual:', visualStyle);
    console.log('📐 Proporção:', aspectRatio);
    console.log('🎞️ Resolução:', resolution);
    console.log('⏱️ Duração:', duration + 's');

    // Validar imagens de referência se for image_to_video
    if (generationType === 'image_to_video' && (!referenceImages || referenceImages.length === 0)) {
      return new Response(
        JSON.stringify({ error: 'Reference images are required for image_to_video generation' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!actionId) {
      return new Response(
        JSON.stringify({ error: 'actionId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Inicializar Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Buscar team_id e details do action
    const { data: actionData, error: actionError } = await supabase
      .from('actions')
      .select('team_id, details')
      .eq('id', actionId)
      .single();

    if (actionError || !actionData) {
      console.error('Error fetching action:', actionError);
      return new Response(
        JSON.stringify({ error: 'Action not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar dados completos para enriquecer o prompt
    let brandData = null;
    let themeData = null;
    let personaData = null;

    const { brand_id, theme_id, persona_id } = actionData.details || {};

    if (brand_id) {
      const { data: brand } = await supabase
        .from('brands')
        .select('*')
        .eq('id', brand_id)
        .maybeSingle();
      brandData = brand;
    }

    if (theme_id) {
      const { data: theme } = await supabase
        .from('strategic_themes')
        .select('*')
        .eq('id', theme_id)
        .maybeSingle();
      themeData = theme;
    }

    if (persona_id) {
      const { data: persona } = await supabase
        .from('personas')
        .select('*')
        .eq('id', persona_id)
        .maybeSingle();
      personaData = persona;
    }

    console.log('📊 Dados contextuais carregados:', {
      brand: brandData?.name || 'N/A',
      theme: themeData?.title || 'N/A',
      persona: personaData?.name || 'N/A'
    });

    // Verificar créditos disponíveis
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .select('credits_suggestions')
      .eq('id', actionData.team_id)
      .single();

    if (teamError || !teamData) {
      console.error('Error fetching team:', teamError);
      return new Response(
        JSON.stringify({ error: 'Team not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se há créditos suficientes
    if (teamData.credits_suggestions < 1) {
      console.log('Insufficient credits for video generation');
      
      // Atualizar action como failed
      await supabase
        .from('actions')
        .update({
          status: 'failed',
          result: { 
            error: 'Créditos insuficientes para gerar vídeo',
            creditsAvailable: teamData.credits_suggestions
          },
          updated_at: new Date().toISOString()
        })
        .eq('id', actionId);

      return new Response(
        JSON.stringify({ error: 'Créditos insuficientes. Por favor, atualize seu plano.' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Credits available:', teamData.credits_suggestions);

    const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
    
    // Função completa para enriquecer prompt com contexto estratégico
    function buildEnrichedPrompt(
      basePrompt: string,
      brandData: any,
      themeData: any,
      personaData: any,
      visualStyle: string,
      includeText: boolean,
      textContent: string,
      textPosition: string
    ): string {
      let enrichedPrompt = '';
      
      // 1. IDENTIDADE DA MARCA
      if (brandData) {
        enrichedPrompt += `🏢 BRAND CONTEXT:\n`;
        enrichedPrompt += `- Brand: ${brandData.name}\n`;
        if (brandData.values) enrichedPrompt += `- Values: ${brandData.values}\n`;
        if (brandData.keywords) enrichedPrompt += `- Visual Identity: ${brandData.keywords}\n`;
        if (brandData.promise) enrichedPrompt += `- Brand Promise: ${brandData.promise}\n`;
        enrichedPrompt += `\n`;
      }
      
      // 2. TEMA ESTRATÉGICO
      if (themeData) {
        enrichedPrompt += `📋 STRATEGIC THEME:\n`;
        enrichedPrompt += `- Campaign: ${themeData.title}\n`;
        if (themeData.objectives) enrichedPrompt += `- Objective: ${themeData.objectives}\n`;
        if (themeData.toneOfVoice) enrichedPrompt += `- Tone of Voice: ${themeData.toneOfVoice}\n`;
        if (themeData.expectedAction) enrichedPrompt += `- Expected Action: ${themeData.expectedAction}\n`;
        enrichedPrompt += `\n`;
      }
      
      // 3. PÚBLICO-ALVO
      if (personaData) {
        enrichedPrompt += `👥 TARGET AUDIENCE:\n`;
        enrichedPrompt += `- Persona: ${personaData.name}\n`;
        enrichedPrompt += `- Demographics: ${personaData.gender}, ${personaData.age}, ${personaData.location}\n`;
        if (personaData.beliefs_and_interests) enrichedPrompt += `- Interests: ${personaData.beliefs_and_interests}\n`;
        if (personaData.main_goal) enrichedPrompt += `- Main Goal: ${personaData.main_goal}\n`;
        if (personaData.challenges) enrichedPrompt += `- Challenges: ${personaData.challenges}\n`;
        if (personaData.preferred_tone_of_voice) enrichedPrompt += `- Preferred Tone: ${personaData.preferred_tone_of_voice}\n`;
        enrichedPrompt += `\n`;
      }
      
      // 4. ESTILO VISUAL
      const styleInstructions: Record<string, string> = {
        cinematic: '🎬 CINEMATIC STYLE: Professional cinematography with smooth camera movements, cinematic lighting, depth of field, film grain, and dramatic composition. Use Hollywood production quality with proper color grading.',
        animation: '🎨 ANIMATION STYLE: Creative animated aesthetics with vibrant colors, stylized movements, cartoon-like or anime-inspired visuals, exaggerated expressions, and playful energy.',
        realistic: '📷 REALISTIC STYLE: Photorealistic rendering with natural lighting, accurate physics, real-world textures, authentic colors, and documentary-like capture.',
        creative: '✨ CREATIVE STYLE: Artistic and experimental approach with unique visual effects, creative transitions, bold colors, and innovative cinematography.'
      };
      enrichedPrompt += `${styleInstructions[visualStyle] || styleInstructions.cinematic}\n\n`;
      
      // 5. PROMPT BASE
      enrichedPrompt += `🎯 VIDEO CONTENT:\n${basePrompt}\n\n`;
      
      // 6. TEXTO OVERLAY
      if (includeText && textContent?.trim()) {
        const positionMap: Record<string, string> = {
          'top': 'at the TOP of the frame',
          'center': 'CENTERED in the frame',
          'bottom': 'at the BOTTOM of the frame',
          'top-left': 'in the TOP-LEFT corner',
          'top-right': 'in the TOP-RIGHT corner',
          'bottom-left': 'in the BOTTOM-LEFT corner',
          'bottom-right': 'in the BOTTOM-RIGHT corner'
        };
        enrichedPrompt += `🎯 MANDATORY TEXT OVERLAY: Display "${textContent}" ${positionMap[textPosition] || 'centered'}. Text must be clearly visible with high contrast throughout the video.\n\n`;
      } else {
        enrichedPrompt += `⛔ NO TEXT: This video must be completely text-free. No words, letters, captions, or written characters.\n\n`;
      }
      
      return enrichedPrompt;
    }
    
    // Usar nova função de prompt com contexto completo
    let enrichedPrompt = buildEnrichedPrompt(
      prompt,
      brandData,
      themeData,
      personaData,
      visualStyle,
      includeText,
      textContent,
      textPosition
    );

    // Adicionar instruções sobre preservação de traços (se houver)
    if (preserveImages && preserveImages.length > 0) {
      enrichedPrompt = `🎨 IDENTITY PRESERVATION: Use EXACTLY the visual style, color palette, and aesthetics from the ${preserveImages.length} reference image(s) provided. Maintain the SAME visual quality, design elements (borders, textures, filters, effects), atmosphere, and mood. The video MUST look like part of the same visual family. ${enrichedPrompt}`;
    }

    if (styleReferenceImages && styleReferenceImages.length > 0) {
      enrichedPrompt = `✨ STYLE INSPIRATION: Use the ${styleReferenceImages.length} style reference image(s) for additional composition and style ideas. Analyze visual elements (colors, layout, objects, atmosphere) and adapt coherently. ${enrichedPrompt}`;
    }

    console.log('📏 Enriched prompt length:', enrichedPrompt.length);
    
    // Usar Veo 3.1 para ambos os tipos de geração
    const modelName = 'veo-3.1-generate-preview';
    
    console.log('🤖 Modelo: Veo 3.1 (veo-3.1-generate-preview)');
    console.log('🎯 Tipo de geração:', generationType);
    if (referenceImages && referenceImages.length > 0) {
      console.log('🖼️ Imagens de referência:', referenceImages.length);
    }
    
    // Prepare request body com estrutura correta para cada modelo
    const requestBody: any = {
      instances: [{
        prompt: enrichedPrompt,
      }],
      parameters: {
        aspectRatio: aspectRatio,  // Formato correto: camelCase
        resolution: resolution,
        durationSeconds: duration,  // Formato correto: camelCase
        generateAudio: audioStyle !== 'none'  // Booleano nos parameters
      }
    };

    // Veo 3.1: Estrutura otimizada seguindo documentação oficial Google Cloud
    if (generationType === 'image_to_video' && referenceImages && referenceImages.length > 0) {
      // Usar a PRIMEIRA imagem como base principal (seguindo documentação Google Cloud)
      requestBody.instances[0].image = {
        bytesBase64Encoded: referenceImages[0], // ✅ Formato correto da API
        mimeType: 'image/png'
      };
      console.log(`🖼️ [Veo 3.1] Imagem principal definida para image-to-video`);
      
      // Imagens adicionais como referências de estilo (se houver)
      if (referenceImages.length > 1) {
        requestBody.instances[0].referenceImages = referenceImages.slice(1).map((img: string) => ({
          image: {
            bytesBase64Encoded: img,
            mimeType: 'image/png'
          },
          referenceType: 'style'
        }));
        console.log(`🎨 [Veo 3.1] ${referenceImages.length - 1} imagem(ns) adicional(is) como estilo`);
      }
    } else if (referenceImages && referenceImages.length > 0) {
      // Para text_to_video ou outros tipos, usar referenceImages
      requestBody.instances[0].referenceImages = referenceImages.map((img: string) => ({
        image: {
          bytesBase64Encoded: img,
          mimeType: 'image/png'
        },
        referenceType: 'asset'
      }));
      console.log(`🖼️ [Veo 3.1] ${referenceImages.length} imagem(ns) de referência adicionadas`);
    }

    // Adicionar prompt negativo se fornecido
    if (negativePrompt && negativePrompt.trim()) {
      requestBody.parameters.negativePrompt = negativePrompt;
      console.log('⛔ Negative prompt:', negativePrompt);
    }
    
    console.log('📦 Request body preparado:', JSON.stringify(requestBody, null, 2));

    // Start video generation with selected model
    console.log(`Starting video generation with ${modelName}...`);
    const generateResponse = await fetch(
      `${BASE_URL}/models/${modelName}:predictLongRunning`,
      {
        method: 'POST',
        headers: {
          'x-goog-api-key': GEMINI_API_KEY,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    );

    if (!generateResponse.ok) {
      const errorText = await generateResponse.text();
      console.error('Video generation API error:', generateResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: `API error: ${errorText}` }),
        { status: generateResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const operationData = await generateResponse.json();
    const operationName = operationData.name;
    
    if (!operationName) {
      console.error('No operation name returned');
      return new Response(
        JSON.stringify({ error: 'Failed to start video generation' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Operation started:', operationName);

    // Iniciar processamento em background (sem awaitar)
    processVideoGeneration(operationName, actionId, actionData.team_id).catch(err => {
      console.error('Background video processing error:', err);
    });

    // Retornar imediatamente com status de processamento
    return new Response(
      JSON.stringify({ 
        status: 'processing',
        message: 'Video generation started. Check action status for updates.',
        operationName: operationName,
        actionId: actionId
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-video function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
