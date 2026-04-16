import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { CREDIT_COSTS } from '../_shared/creditCosts.ts';
import { checkUserCredits, deductUserCredits, recordUserCreditUsage } from '../_shared/userCredits.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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
    
    const { brand, themes, platform, platforms, quantity, objective, additionalInfo, userId, teamId } = await req.json();
    
    // Normalize platforms: accept both legacy `platform` (string) and new `platforms` (array)
    const platformList: string[] = Array.isArray(platforms)
      ? platforms.filter((p) => typeof p === 'string' && p.trim().length > 0)
      : (typeof platform === 'string' && platform.trim().length > 0 ? [platform] : []);
    
    console.log('Request payload:', { brand, themes, platforms: platformList, quantity, userId, teamId });

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
    const normalizedPlatforms = platformList.map((p) => p.toLowerCase().trim());
    if (normalizedPlatforms.length === 0 || normalizedPlatforms.some((p) => !validPlatforms.includes(p))) {
      console.error('Invalid platforms:', platformList);
      return new Response(
        JSON.stringify({ error: 'Invalid platforms' }),
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

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Check user credits (individual)
    const creditCheck = await checkUserCredits(supabase, userId, CREDIT_COSTS.CONTENT_PLAN);

    if (!creditCheck.hasCredits) {
      return new Response(
        JSON.stringify({ error: 'Créditos insuficientes' }),
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

    const geminiApiKey = Deno.env.get('GEMINI_API_KEY');
    if (!geminiApiKey) {
      console.error('Gemini API key not configured');
      return new Response(
        JSON.stringify({ error: 'Service configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const platformLabel = normalizedPlatforms.join(', ');
    const today = new Date();
    const todayISO = today.toISOString().split('T')[0];

    const systemPrompt = `Você é um especialista em planejamento de conteúdo estratégico para redes sociais.

IMPORTANTE: Você DEVE gerar EXATAMENTE ${quantity} conteúdo(s) completo(s), distribuídos entre as plataformas selecionadas: ${platformLabel}.

Sua resposta DEVE conter DUAS partes, nesta ordem exata:

PARTE 1 — Markdown legível para humanos (mantenha como já fazemos hoje):

# Plano de Conteúdo Estratégico

## Marca: [Nome da Marca]
## Tema(s): [Temas Estratégicos]
## Plataforma(s): ${platformLabel}
## Quantidade de Conteúdos: ${quantity}
## Objetivo Principal: [Objetivo]

---

## SUGESTÕES DE CONTEÚDOS

Para CADA UM dos ${quantity} conteúdos:

### Conteúdo [N] - [Título Descritivo e Chamativo]

**Plataforma:** [Uma das plataformas selecionadas]
**Data sugerida:** [YYYY-MM-DD a partir de ${todayISO}]
**Objetivo:** [Autoridade, Prova Social, Educação, Cultura/Marca, etc]
**Funil:** [Topo, Meio ou Fundo]
**Persona:** [Descrição do público-alvo]
**Grande Ideia:** [Conceito principal em uma frase]
**Formato:** [Reels, Carrossel, Post estático, Story, Vídeo curto, etc]
**Resumo:** [2-3 linhas resumindo o conteúdo]
**Copy Sugerida:** [Texto completo da legenda com CTA]
**Imagem/Vídeo:** [Descrição visual detalhada]
**Hashtags:** [5-10 hashtags relevantes]
**Melhor Horário:** [Sugestão de horário]

---

PARTE 2 — Bloco JSON estruturado (OBRIGATÓRIO), no FINAL da resposta, dentro de um bloco \`\`\`json ... \`\`\`. Use exatamente este schema:

\`\`\`json
{
  "posts": [
    {
      "title": "string",
      "platform": "instagram|facebook|linkedin|twitter|tiktok",
      "format": "string",
      "summary": "string curto (1-2 frases)",
      "date": "YYYY-MM-DD",
      "objective": "string",
      "funnel": "Topo|Meio|Fundo",
      "persona": "string",
      "bigIdea": "string",
      "copy": "string completa",
      "visual": "string descritiva",
      "hashtags": ["#tag1", "#tag2"],
      "bestTime": "string"
    }
  ]
}
\`\`\`

REGRAS:
- O JSON deve conter EXATAMENTE ${quantity} itens em "posts".
- "platform" deve ser um dos valores: ${normalizedPlatforms.map((p) => `"${p}"`).join(', ')}.
- Distribua os conteúdos entre as plataformas de forma equilibrada.
- "date" deve estar em formato ISO (YYYY-MM-DD), começando a partir de ${todayISO} e espaçando os conteúdos.
- O JSON DEVE ser parseável (sem comentários, sem trailing commas).`;

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

    const userPrompt = `${brandContext}\n${themesContext}\n\nPlataformas: ${platformLabel}\nQuantidade de Conteúdos: ${quantity}\nObjetivo: ${objective}\n${additionalInfo ? `Informações Adicionais: ${additionalInfo}` : ''}\n\nPor favor, gere um plano estratégico completo com EXATAMENTE ${quantity} conteúdo(s) seguindo a estrutura fornecida (Markdown + bloco JSON final).`;

    console.log('Calling Gemini API with gemini-2.5-flash model...');
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: userPrompt }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8000,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns instantes.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 401 || response.status === 403) {
        console.error('Gemini API authentication failed');
        return new Response(
          JSON.stringify({ error: 'Erro de autenticação com o serviço de IA. Entre em contato com o suporte.' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: `Erro no serviço de IA: ${response.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Gemini API response received successfully');

    const data = await response.json();
    
    if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
      console.error('Invalid Gemini response format:', JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: 'Resposta inválida do serviço de IA' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const generatedPlan = data.candidates[0].content.parts[0].text;

    // Deduct credits (individual)
    const deductResult = await deductUserCredits(supabase, userId, CREDIT_COSTS.CONTENT_PLAN);

    if (!deductResult.success) {
      return new Response(
        JSON.stringify({ error: 'Erro ao atualizar créditos' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Record credit usage
    await recordUserCreditUsage(supabase, {
      userId,
      teamId: teamId || null,
      actionType: 'CONTENT_PLAN',
      creditsUsed: CREDIT_COSTS.CONTENT_PLAN,
      creditsBefore: creditCheck.currentCredits,
      creditsAfter: deductResult.newCredits,
      description: 'Calendário de conteúdo',
      metadata: { platform, quantity, themes }
    });

    // Save action
    const { data: actionData, error: insertError } = await supabase
      .from('actions')
      .insert({
        type: 'PLANEJAR_CONTEUDO',
        user_id: userId,
        team_id: teamId || null,
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
        creditsRemaining: deductResult.newCredits 
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
