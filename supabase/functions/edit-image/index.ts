import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_PROMPT_LENGTH = 8000;

function cleanInput(text: string | undefined | null): string {
  if (!text) return '';
  let cleanedText = text.replace(/[<>{}\[\]"`]/g, '');
  cleanedText = cleanedText.replace(/\s+/g, ' ').trim();
  return cleanedText;
}

function buildRevisionPrompt(
  adjustment: string, 
  brandData: any | null, 
  themeData: any | null,
  hasLogo: boolean,
  platform?: string,
  aspectRatio?: string
): string {
  let promptParts: string[] = [
    "🎨 Você é um diretor de arte especializado em design para redes sociais e edição de imagens com IA.",
    "",
    "📋 OBJETIVO PRINCIPAL:",
    `Editar a imagem fornecida aplicando este ajuste: "${cleanInput(adjustment)}"`,
    "",
    "⚠️ IMPORTANTE:",
    "- Aplique o ajuste solicitado de forma VISÍVEL e CLARA",
    "- Mantenha a QUALIDADE PROFISSIONAL da imagem",
    "- Preserve elementos que funcionam bem, mas não tenha medo de fazer mudanças significativas se solicitado",
    "- Se o ajuste pedir mudanças de composição, cores ou elementos, execute-as com confiança",
    ""
  ];

  // Adicionar contexto de plataforma se disponível
  if (platform || aspectRatio) {
    promptParts.push("📱 CONTEXTO DA PLATAFORMA:");
    if (platform) promptParts.push(`- Plataforma: ${platform}`);
    if (aspectRatio) promptParts.push(`- Proporção: ${aspectRatio}`);
    promptParts.push("");
  }

  if (hasLogo) {
    promptParts.push(
      "🏷️ LOGO DA MARCA:",
      "- A marca possui um logo definido",
      "- Reserve espaço apropriado para o logo se for o caso",
      "- Garanta que a estética se alinhe com a identidade visual da marca",
      ""
    );
  }

  if (brandData) {
    promptParts.push("🎯 IDENTIDADE DA MARCA (seguir estas diretrizes):");
    
    if (brandData.name) promptParts.push(`📌 Nome: ${cleanInput(brandData.name)}`);
    if (brandData.segment) promptParts.push(`🏢 Segmento: ${cleanInput(brandData.segment)}`);
    if (brandData.values) promptParts.push(`💎 Valores: ${cleanInput(brandData.values)}`);
    if (brandData.promise) promptParts.push(`✨ Promessa: ${cleanInput(brandData.promise)}`);
    
    if (brandData.color_palette) {
      try {
        const colors = typeof brandData.color_palette === 'string' 
          ? JSON.parse(brandData.color_palette) 
          : brandData.color_palette;
        promptParts.push(`🎨 Paleta de Cores: ${JSON.stringify(colors)} - Use estas cores harmoniosamente`);
      } catch (e) {
        console.error('Erro ao processar paleta de cores:', e);
      }
    }
    
    if (brandData.restrictions) {
      promptParts.push(`🚫 NÃO FAZER: ${cleanInput(brandData.restrictions)}`);
    }
    
    if (brandData.keywords) promptParts.push(`🔑 Palavras-chave: ${cleanInput(brandData.keywords)}`);
    if (brandData.goals) promptParts.push(`🎯 Metas: ${cleanInput(brandData.goals)}`);
    
    promptParts.push("");
  }

  if (themeData) {
    promptParts.push("🎭 TEMA ESTRATÉGICO:");
    
    if (themeData.title) promptParts.push(`📋 Título: ${cleanInput(themeData.title)}`);
    if (themeData.description) promptParts.push(`📝 Descrição: ${cleanInput(themeData.description)}`);
    if (themeData.tone_of_voice) promptParts.push(`🗣️ Tom de Voz: ${cleanInput(themeData.tone_of_voice)}`);
    if (themeData.objectives) promptParts.push(`🎯 Objetivos: ${cleanInput(themeData.objectives)}`);
    if (themeData.target_audience) promptParts.push(`👥 Público: ${cleanInput(themeData.target_audience)}`);
    if (themeData.content_format) promptParts.push(`📄 Formato: ${cleanInput(themeData.content_format)}`);
    if (themeData.expected_action) promptParts.push(`⚡ Ação Esperada: ${cleanInput(themeData.expected_action)}`);
    
    if (themeData.color_palette) {
      promptParts.push(`🎨 Paleta do Tema: ${themeData.color_palette}`);
    }
    
    if (themeData.hashtags) promptParts.push(`#️⃣ Hashtags: ${cleanInput(themeData.hashtags)}`);
    
    promptParts.push("");
  }

  promptParts.push(
    "✅ RESULTADO ESPERADO:",
    "- Imagem editada com ALTA QUALIDADE e REALISMO PROFISSIONAL",
    "- Ajuste solicitado aplicado de forma VISÍVEL e EFETIVA",
    "- Alinhamento perfeito com identidade de marca e tema (se fornecidos)",
    "- Composição visualmente impactante e apropriada para redes sociais",
    ""
  );

  const finalPrompt = promptParts.join('\n');
  
  // Se exceder o limite, priorizar as informações mais importantes
  if (finalPrompt.length > MAX_PROMPT_LENGTH) {
    console.warn(`⚠️ Prompt muito longo (${finalPrompt.length} chars), truncando...`);
    return finalPrompt.substring(0, MAX_PROMPT_LENGTH);
  }
  
  return finalPrompt;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reviewPrompt, imageUrl, brandId, themeId, platform, aspectRatio } = await req.json();

    console.log('📝 [EDIT-IMAGE] Dados recebidos:', {
      brandId,
      themeId,
      hasImageUrl: !!imageUrl,
      promptLength: reviewPrompt?.length || 0
    });

    if (!reviewPrompt || !imageUrl) {
      return new Response(
        JSON.stringify({ error: 'reviewPrompt e imageUrl são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Configuração do Supabase não encontrada');
      return new Response(
        JSON.stringify({ error: 'Configuração do servidor incompleta' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch complete brand data if brandId is provided
    let brandData = null;
    if (brandId) {
      console.log('🔍 Buscando dados da marca...');
      const { data, error: brandError } = await supabase
        .from('brands')
        .select('*')
        .eq('id', brandId)
        .single();

      if (brandError) {
        console.error('⚠️ Erro ao buscar marca:', brandError);
      } else {
        brandData = data;
      }
    }

    // Fetch theme data if themeId is provided
    let themeData = null;
    if (themeId) {
      console.log('🔍 Buscando dados do tema...');
      const { data, error: themeError } = await supabase
        .from('strategic_themes')
        .select('*')
        .eq('id', themeId)
        .single();

      if (!themeError && data) {
        themeData = data;
      }
    }

    // Build detailed prompt with brand and theme context
    const hasLogo = brandData?.logo ? true : false;
    const detailedPrompt = buildRevisionPrompt(reviewPrompt, brandData, themeData, hasLogo, platform, aspectRatio);

    console.log('📝 [EDIT-IMAGE] Prompt detalhado gerado:');
    console.log('   - Comprimento:', detailedPrompt.length, 'caracteres');
    console.log('   - Tem dados de marca:', !!brandData);
    console.log('   - Tem dados de tema:', !!themeData);
    console.log('   - Plataforma:', platform || 'não especificada');
    console.log('   - Aspect Ratio:', aspectRatio || 'não especificado');
    console.log('   - Ajuste solicitado:', reviewPrompt.substring(0, 100) + '...');

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    
    if (!GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY não configurada');
      return new Response(
        JSON.stringify({ error: 'API key não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🤖 Chamando Gemini API para edição de imagem...');

    // Verificar se é base64 ou URL e converter adequadamente
    let imageBase64: string;
    let imageMime = 'image/png';
    
    if (imageUrl.startsWith('data:')) {
      // Já é base64
      imageBase64 = imageUrl.split(',')[1];
      imageMime = imageUrl.match(/data:(.*?);/)?.[1] || 'image/png';
      console.log('📷 Imagem recebida como base64');
    } else {
      // É uma URL, precisa baixar e converter
      console.log('📷 Baixando imagem da URL:', imageUrl);
      const imageResponse = await fetch(imageUrl);
      
      if (!imageResponse.ok) {
        throw new Error(`Erro ao baixar imagem: ${imageResponse.status}`);
      }
      
      const imageBuffer = await imageResponse.arrayBuffer();
      
      // Converter ArrayBuffer para base64 usando chunks para evitar stack overflow
      const bytes = new Uint8Array(imageBuffer);
      let binary = '';
      const chunkSize = 8192; // Process in chunks to avoid stack overflow
      
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
        binary += String.fromCharCode(...chunk);
      }
      
      imageBase64 = btoa(binary);
      
      // Detectar mime type da resposta
      const contentType = imageResponse.headers.get('content-type');
      if (contentType) {
        imageMime = contentType;
      }
      console.log('✅ Imagem convertida para base64, tipo:', imageMime);
    }

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: detailedPrompt },
            { 
              inlineData: { 
                mimeType: imageMime, 
                data: imageBase64 
              } 
            }
          ]
        }],
        generationConfig: {
          temperature: 0.9,
          topP: 0.95,
          topK: 64,
          maxOutputTokens: 8192,
        }
      })
    });

    console.log('📡 Status da resposta Gemini API:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro na API Gemini:', errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns minutos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const aiData = await response.json();
    console.log('✅ Resposta da AI recebida');

    // Verificar se a resposta tem conteúdo válido
    if (!aiData.candidates || aiData.candidates.length === 0) {
      console.error('❌ Resposta da API sem candidates');
      console.error('📊 Resposta completa:', JSON.stringify(aiData, null, 2));
      throw new Error('Resposta inválida da API - sem candidates');
    }

    // Log do primeiro candidate para debugging
    const firstCandidate = aiData.candidates[0];
    console.log('📋 Candidate status:', {
      hasContent: !!firstCandidate?.content,
      hasParts: !!firstCandidate?.content?.parts,
      partsCount: firstCandidate?.content?.parts?.length || 0,
      finishReason: firstCandidate?.finishReason
    });

    // Extrair imagem da resposta do Gemini
    const geminiImageData = aiData.candidates?.[0]?.content?.parts?.find(
      (part: any) => part.inlineData
    )?.inlineData;
    
    if (!geminiImageData) {
      console.error('❌ Imagem editada não foi retornada pela API');
      console.error('📊 Dados recebidos:', JSON.stringify(aiData, null, 2));
      throw new Error('Imagem editada não foi retornada pela API');
    }

    const editedImageBase64 = `data:${geminiImageData.mimeType};base64,${geminiImageData.data}`;

    console.log('📤 Fazendo upload da imagem editada para Storage...');

    // Extract base64 data from data URL
    const base64Data = editedImageBase64.split(',')[1] || editedImageBase64;
    
    // Convert base64 to Uint8Array
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = crypto.randomUUID();
    const fileName = `edited-images/${timestamp}-${randomId}.png`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('content-images')
      .upload(fileName, bytes, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Erro ao fazer upload:', uploadError);
      throw new Error(`Erro ao fazer upload da imagem: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('content-images')
      .getPublicUrl(fileName);

    console.log('✅ Imagem editada com sucesso e armazenada:', publicUrl);

    return new Response(
      JSON.stringify({ editedImageUrl: publicUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro em edit-image:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro ao editar imagem' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
