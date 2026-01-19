import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { checkUserCredits, deductUserCredits, recordUserCreditUsage } from '../_shared/userCredits.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ANIMATION_CREDIT_COST = 15; // Credit cost for animation

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageData, animationPrompt, userId, teamId } = await req.json();
    
    console.log('Animate image request received:', {
      userId,
      teamId,
      promptLength: animationPrompt?.length,
      hasImage: !!imageData
    });

    // Input validation
    if (!imageData) {
      return new Response(
        JSON.stringify({ error: 'Imagem é obrigatória' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!animationPrompt || animationPrompt.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Prompt de animação é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Autenticação necessária' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check user credits (individual)
    const creditCheck = await checkUserCredits(supabase, userId, ANIMATION_CREDIT_COST);

    if (!creditCheck.hasCredits) {
      return new Response(
        JSON.stringify({ 
          error: 'Créditos insuficientes',
          required: ANIMATION_CREDIT_COST,
          available: creditCheck.currentCredits
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // TODO: When the agent is trained, implement animation logic here
    // Structure prepared for future AI model integration
    
    console.log('Preparing animation with prompt:', animationPrompt.substring(0, 100));

    // Placeholder: return message indicating it's in development
    // When the model is ready, replace this section with AI model call
    
    /*
    FUTURE IMPLEMENTATION:
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    const response = await fetch('https://ai.gateway.lovable.dev/v1/video/animate', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        image: imageData,
        prompt: animationPrompt,
        duration: 3, // seconds
        fps: 30,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns instantes.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos do workspace esgotados. Entre em contato com o suporte.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const errorData = await response.json();
      throw new Error(errorData.error || 'Erro ao processar animação');
    }

    const animationData = await response.json();
    const videoUrl = animationData.videoUrl;

    // Deduct credits
    const deductResult = await deductUserCredits(supabase, userId, ANIMATION_CREDIT_COST);

    if (!deductResult.success) {
      console.error('Error deducting credits:', deductResult.error);
    }

    // Record credit usage
    await recordUserCreditUsage(supabase, {
      userId: userId,
      teamId: teamId || null,
      actionType: 'ANIMAR_IMAGEM',
      creditsUsed: ANIMATION_CREDIT_COST,
      creditsBefore: creditCheck.currentCredits,
      creditsAfter: deductResult.newCredits,
      description: 'Animação de imagem com IA',
      metadata: {
        prompt: animationPrompt.substring(0, 200)
      }
    });

    // Save action to history
    await supabase.from('actions').insert({
      user_id: userId,
      team_id: teamId || '00000000-0000-0000-0000-000000000000',
      type: 'ANIMAR_IMAGEM',
      status: 'completed',
      details: {
        prompt: animationPrompt
      },
      result: {
        videoUrl: videoUrl
      }
    });

    return new Response(
      JSON.stringify({ 
        videoUrl,
        creditsUsed: ANIMATION_CREDIT_COST,
        creditsRemaining: deductResult.newCredits
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    */

    // For now, return development message
    // Using status 200 to avoid error in client, but with development flag
    return new Response(
      JSON.stringify({ 
        status: 'training',
        message: 'Funcionalidade em desenvolvimento',
        info: 'O agente de IA para animação de imagens ainda está sendo treinado. Em breve você poderá animar suas imagens com IA.'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Erro na função animate-image:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido ao processar animação'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
