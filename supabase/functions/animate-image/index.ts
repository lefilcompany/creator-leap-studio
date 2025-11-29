import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

    // Validação dos inputs
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

    if (!userId || !teamId) {
      return new Response(
        JSON.stringify({ error: 'Autenticação necessária' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Inicializar Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verificar créditos do time
    const { data: team, error: teamError } = await supabase
      .from('teams')
      .select('credits')
      .eq('id', teamId)
      .single();

    if (teamError || !team) {
      console.error('Erro ao buscar time:', teamError);
      return new Response(
        JSON.stringify({ error: 'Time não encontrado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const ANIMATION_CREDIT_COST = 15; // Custo de créditos para animação

    if (team.credits < ANIMATION_CREDIT_COST) {
      return new Response(
        JSON.stringify({ 
          error: 'Créditos insuficientes',
          required: ANIMATION_CREDIT_COST,
          available: team.credits
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // TODO: Quando o agente estiver treinado, implementar a lógica de animação aqui
    // Estrutura preparada para integração futura com modelo de IA
    
    console.log('Preparing animation with prompt:', animationPrompt.substring(0, 100));

    // Placeholder: retornar mensagem indicando que está em desenvolvimento
    // Quando o modelo estiver pronto, substituir esta seção pela chamada ao modelo de IA
    
    /*
    IMPLEMENTAÇÃO FUTURA:
    
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
        duration: 3, // segundos
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
    */

    // Por enquanto, retornar mensagem de desenvolvimento
    // Usando status 200 para evitar erro no client, mas com flag de desenvolvimento
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

    // Quando implementado, descomentar o código abaixo para deduzir créditos e salvar histórico:
    /*
    // Deduzir créditos
    const { error: updateError } = await supabase
      .from('teams')
      .update({ 
        credits: team.credits - ANIMATION_CREDIT_COST 
      })
      .eq('id', teamId);

    if (updateError) {
      console.error('Erro ao atualizar créditos:', updateError);
    }

    // Registrar no histórico de créditos
    await supabase.from('credit_history').insert({
      team_id: teamId,
      user_id: userId,
      action_type: 'ANIMAR_IMAGEM',
      credits_used: ANIMATION_CREDIT_COST,
      credits_before: team.credits,
      credits_after: team.credits - ANIMATION_CREDIT_COST,
      description: 'Animação de imagem com IA',
      metadata: {
        prompt: animationPrompt.substring(0, 200)
      }
    });

    // Salvar ação no histórico
    await supabase.from('actions').insert({
      user_id: userId,
      team_id: teamId,
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
        creditsRemaining: team.credits - ANIMATION_CREDIT_COST
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    */

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
