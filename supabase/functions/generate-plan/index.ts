import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Log request details for debugging
    console.log('Generate plan request received');
    
    // Validate authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const { brand, themes, platform, quantity, objective, additionalInfo, userId, teamId } = await req.json();
    console.log('Request payload:', { brand, themes, platform, quantity, userId, teamId });

    // Input validation
    if (!brand || typeof brand !== 'string' || brand.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Brand is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!themes || !Array.isArray(themes) || themes.length === 0 || themes.length > 10) {
      return new Response(
        JSON.stringify({ error: 'Themes must be an array with 1-10 items' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const validPlatforms = ['instagram', 'linkedin', 'facebook', 'twitter', 'tiktok'];
    const normalizedPlatform = platform.toLowerCase().trim();
    if (!normalizedPlatform || !validPlatforms.includes(normalizedPlatform)) {
      console.error('Invalid platform:', platform);
      return new Response(
        JSON.stringify({ error: 'Invalid platform' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!quantity || typeof quantity !== 'number' || quantity < 1 || quantity > 50) {
      return new Response(
        JSON.stringify({ error: 'Quantity must be between 1 and 50' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!objective || typeof objective !== 'string' || objective.length > 1000) {
      return new Response(
        JSON.stringify({ error: 'Invalid objective' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (additionalInfo && typeof additionalInfo === 'string' && additionalInfo.length > 2000) {
      return new Response(
        JSON.stringify({ error: 'Additional info too long' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check team credits
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .select('credits_plans')
      .eq('id', teamId)
      .single();

    if (teamError || !teamData) {
      return new Response(
        JSON.stringify({ error: 'Unable to verify credits' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (teamData.credits_plans <= 0) {
      return new Response(
        JSON.stringify({ error: 'Insufficient credits' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch brand details
    const { data: brandData } = await supabase
      .from('brands')
      .select('*')
      .eq('id', brand)
      .single();

    // Fetch theme details
    const { data: themeData } = await supabase
      .from('strategic_themes')
      .select('*')
      .in('id', themes);

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: 'Service configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `Você é um especialista em planejamento de conteúdo estratégico para redes sociais.

IMPORTANTE: Você DEVE gerar EXATAMENTE ${quantity} post(s) completo(s).

Use a seguinte estrutura para o planejamento:

# Plano de Conteúdo Estratégico

## Marca: [Nome da Marca]

## Tema(s): [Temas Estratégicos]

## Plataforma: [Plataforma]

## Quantidade de Posts: ${quantity}

## Objetivo Principal: [Objetivo]

---

## SUGESTÕES DE POSTS

Para CADA UM dos ${quantity} posts, siga EXATAMENTE este formato:

### Post [N] - [Título Descritivo e Chamativo]

**Objetivo:** [Objetivo específico - ex: Autoridade, Prova Social, Educação, Cultura/Marca]

**Funil:** [Topo, Meio ou Fundo]

**Persona:** [Descrição específica do público-alvo]

**Grande Ideia:** [Conceito principal em uma frase impactante]

**Formato:** [Tipo de conteúdo - Reels, Carrossel, IGTV, Post estático, etc]

**Copy Sugerida:** [Texto completo e detalhado da legenda, incluindo call-to-action]

**Imagem/Vídeo:** [Descrição visual detalhada do conteúdo, incluindo elementos visuais, cores, composição]

**Hashtags:** [5-10 hashtags relevantes]

**Melhor Horário:** [Sugestão de horário para publicação baseado no comportamento da persona]

---

IMPORTANTE: Certifique-se de que TODOS os ${quantity} posts estejam completos e bem estruturados.`;

    let brandContext = '';
    if (brandData) {
      brandContext = `
Contexto da Marca:
- Nome: ${brandData.name}
- Segmento: ${brandData.segment}
- Valores: ${brandData.values || 'Não especificado'}
- Promessa: ${brandData.promise || 'Não especificado'}
- Palavras-chave: ${brandData.keywords || 'Não especificado'}
- Objetivos: ${brandData.goals || 'Não especificado'}
`;
    }

    let themesContext = '';
    if (themeData && themeData.length > 0) {
      themesContext = '\nTemas Estratégicos:\n';
      themeData.forEach((theme: any, index: number) => {
        themesContext += `
Tema ${index + 1}:
- Título: ${theme.title}
- Descrição: ${theme.description}
- Tom de voz: ${theme.tone_of_voice}
- Público-alvo: ${theme.target_audience}
- Ação esperada: ${theme.expected_action}
- Melhores formatos: ${theme.best_formats}
`;
      });
    }

    const userPrompt = `${brandContext}\n${themesContext}\n\nPlataforma: ${platform}\nQuantidade de Posts: ${quantity}\nObjetivo: ${objective}\n${additionalInfo ? `Informações Adicionais: ${additionalInfo}` : ''}\n\nPor favor, gere um plano estratégico completo com EXATAMENTE ${quantity} post(s) seguindo a estrutura fornecida.`;

    console.log('Calling Lovable AI API...');
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please contact support.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: `AI service error: ${errorText}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('AI API response received successfully');

    const data = await response.json();
    const generatedPlan = data.choices[0].message.content;

    // Decrement credits
    const { error: updateError } = await supabase
      .from('teams')
      .update({ credits_plans: teamData.credits_plans - 1 })
      .eq('id', teamId);

    if (updateError) {
      return new Response(
        JSON.stringify({ error: 'Unable to update credits' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save action
    const { data: actionData, error: insertError } = await supabase
      .from('actions')
      .insert({
        type: 'PLANEJAR_CONTEUDO',
        user_id: userId,
        team_id: teamId,
        brand_id: brand,
        status: 'Aguardando revisão',
        result: { plan: generatedPlan },
        details: { themes, platform, quantity, objective, additionalInfo }
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Error saving action:', insertError);
      return new Response(
        JSON.stringify({ error: 'Unable to save plan' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        plan: generatedPlan,
        actionId: actionData.id,
        creditsRemaining: teamData.credits_plans - 1 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'An unexpected error occurred' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
