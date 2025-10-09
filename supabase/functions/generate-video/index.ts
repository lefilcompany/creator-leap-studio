import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Função para processar vídeo em background
async function processVideoGeneration(operationName: string, actionId: string) {
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

    // Atualizar o action no banco com a URL do vídeo
    const { error: updateError } = await supabase
      .from('actions')
      .update({
        result: { 
          videoUrl,
          processingTime: `${attempts * 5} seconds`,
          attempts: attempts
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

    const { prompt, referenceImage, actionId } = await req.json();
    console.log('🎬 Iniciando geração de vídeo com Gemini Veo 3');
    console.log('📝 Prompt:', prompt);
    console.log('🆔 Action ID:', actionId);
    console.log('🖼️ Imagem de referência:', referenceImage ? 'Sim' : 'Não');

    if (!actionId) {
      return new Response(
        JSON.stringify({ error: 'actionId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
    
    // Prepare request body
    const requestBody: any = {
      instances: [{
        prompt: prompt,
      }]
    };

    // Add reference image if provided
    if (referenceImage) {
      const mimeType = referenceImage.split(';')[0].split(':')[1];
      const base64Data = referenceImage.split(',')[1];
      
      requestBody.instances[0].image = {
        bytesBase64Encoded: base64Data,
        mimeType: mimeType
      };
    }

    // Start video generation
    console.log('Starting video generation operation...');
    const generateResponse = await fetch(
      `${BASE_URL}/models/veo-3.0-generate-001:predictLongRunning`,
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
    processVideoGeneration(operationName, actionId).catch(err => {
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
