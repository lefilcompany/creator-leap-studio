import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
        JSON.stringify({ error: 'GEMINI_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { prompt, referenceImage } = await req.json();
    console.log('Generating video with prompt:', prompt);

    const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";
    
    // Prepare request body
    const requestBody: any = {
      instances: [{
        prompt: prompt,
      }]
    };

    // Add reference image if provided (base64 encoded)
    if (referenceImage) {
      // Extract mime type from data URL (e.g., "data:image/png;base64,...")
      const mimeType = referenceImage.split(';')[0].split(':')[1];
      const base64Data = referenceImage.split(',')[1];
      
      requestBody.instances[0].image = {
        bytesBase64Encoded: base64Data,
        mimeType: mimeType
      };
    }

    // Start video generation (long-running operation)
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

    // Poll the operation status until video is ready
    let isDone = false;
    let videoUri = null;
    let attempts = 0;
    const maxAttempts = 60; // 10 minutes max (10 seconds * 60)

    while (!isDone && attempts < maxAttempts) {
      console.log(`Polling attempt ${attempts + 1}/${maxAttempts}...`);
      
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      
      const statusResponse = await fetch(
        `${BASE_URL}/${operationName}`,
        {
          headers: {
            'x-goog-api-key': GEMINI_API_KEY,
          },
        }
      );

      if (!statusResponse.ok) {
        console.error('Status check failed:', statusResponse.status);
        attempts++;
        continue;
      }

      const statusData = await statusResponse.json();
      isDone = statusData.done === true;

      if (isDone) {
        videoUri = statusData.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
        console.log('Video generation complete! URI:', videoUri);
      }

      attempts++;
    }

    if (!videoUri) {
      console.error('Video generation timeout or failed');
      return new Response(
        JSON.stringify({ 
          error: 'Video generation timeout. Please try again.',
          attempts: attempts
        }),
        { status: 408, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Download the video
    console.log('Downloading video from:', videoUri);
    const videoResponse = await fetch(videoUri, {
      headers: {
        'x-goog-api-key': GEMINI_API_KEY,
      },
    });

    if (!videoResponse.ok) {
      console.error('Video download failed:', videoResponse.status);
      return new Response(
        JSON.stringify({ error: 'Failed to download generated video' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const videoBlob = await videoResponse.blob();
    const arrayBuffer = await videoBlob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Processar em chunks para evitar stack overflow
    let binary = '';
    const chunkSize = 0x8000; // 32KB chunks
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, Math.min(i + chunkSize, uint8Array.length));
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    const videoBase64 = btoa(binary);
    
    console.log('Video generated successfully');
    return new Response(
      JSON.stringify({ 
        videoUrl: `data:video/mp4;base64,${videoBase64}`,
        attempts: attempts
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
