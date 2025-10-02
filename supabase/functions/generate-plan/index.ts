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
    const { brand, themes, platform, quantity, objective, additionalInfo, userId, teamId } = await req.json();

    console.log('Generate Plan Request:', { brand, themes, platform, quantity, objective, userId, teamId });

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

    if (teamError) {
      console.error('Error fetching team:', teamError);
      return new Response(
        JSON.stringify({ error: 'Erro ao verificar créditos' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!teamData || teamData.credits_plans <= 0) {
      return new Response(
        JSON.stringify({ error: 'Créditos insuficientes para planejamento' }),
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
      throw new Error('Lovable API key not configured');
    }

    // Build comprehensive prompt based on PDF structure
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

**Estrutura/Roteiro:**
1. [Primeiro elemento/hook]
2. [Desenvolvimento]
3. [Prova/Valor]
4. [Conclusão/CTA]

**Legenda/Copy:**
[Texto completo da legenda, incluindo emojis se apropriado. Sempre adicione ao final: "*Beba com moderação. Bebida destinada para maiores de 18 anos." se aplicável à marca]

**CTA (Call to Action):**
[Chamada para ação clara e específica]

**Brief de Arte:**
[Descrição visual detalhada com paleta de cores, elementos visuais, composição]

**Hashtags:**
[5-8 hashtags relevantes separadas por espaço]

**Distribuição:**
[Estratégia de impulsionamento e alcance]

**Métrica-chave:**
[KPI principal para medir o sucesso deste post]

---

REGRAS IMPORTANTES:
- Gere EXATAMENTE ${quantity} post(s) seguindo este formato
- Mantenha a formatação com os títulos em negrito (**Título:**)
- Seja específico e detalhado em cada campo
- Não pule nenhum campo
- Use linguagem profissional mas acessível
- Separe cada post com uma linha de "---"`;

    const userPrompt = `Crie um plano de conteúdo completo com EXATAMENTE ${quantity} post(s).

**INFORMAÇÕES DA MARCA:**
${brandData?.name || brand}
${brandData ? `
- Segmento: ${brandData.segment}
- Valores: ${brandData.values}
- Objetivos: ${brandData.goals}
- Palavras-chave: ${brandData.keywords}
${brandData.promise ? `- Promessa: ${brandData.promise}` : ''}
` : ''}

**TEMAS ESTRATÉGICOS:**
${themeData?.map((t: any, i: number) => `
${i + 1}. ${t.title}
   - ${t.description}
   - Objetivos: ${t.objectives}
   - Público: ${t.target_audience}
   - Tom: ${t.tone_of_voice}
   - Formatos: ${t.best_formats}
`).join('\n') || themes.join(', ')}

**ESPECIFICAÇÕES:**
- Plataforma: ${platform}
- Quantidade de Posts: ${quantity}
- Objetivo: ${objective}
${additionalInfo ? `- Informações Adicionais: ${additionalInfo}` : ''}

LEMBRE-SE: Gere EXATAMENTE ${quantity} post(s) completo(s) seguindo TODA a estrutura fornecida.`;

    console.log('Calling Lovable AI...');

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
        max_completion_tokens: 8000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        throw new Error('Limite de requisições excedido. Tente novamente em alguns instantes.');
      }
      if (response.status === 402) {
        throw new Error('Créditos insuficientes no Lovable AI. Adicione créditos em Settings -> Workspace -> Usage.');
      }
      
      throw new Error(`Erro ao gerar planejamento: ${response.status}`);
    }

    const data = await response.json();
    const planContent = data.choices[0].message.content;

    console.log('Plan generated successfully');

    // Decrement team credits
    const { error: updateError } = await supabase
      .from('teams')
      .update({ credits_plans: teamData.credits_plans - 1 })
      .eq('id', teamId);

    if (updateError) {
      console.error('Error updating credits:', updateError);
    }

    // Create action record
    const { data: actionData, error: actionError } = await supabase
      .from('actions')
      .insert({
        type: 'PLANEJAR_CONTEUDO',
        brand_id: brand,
        team_id: teamId,
        user_id: userId,
        status: 'Aprovado',
        approved: true,
        details: {
          brand,
          themes,
          platform,
          quantity,
          objective,
          additionalInfo
        },
        result: {
          plan: planContent
        }
      })
      .select()
      .single();

    if (actionError) {
      console.error('Error creating action:', actionError);
    }

    return new Response(
      JSON.stringify({ 
        plan: planContent,
        actionId: actionData?.id,
        creditsRemaining: teamData.credits_plans - 1
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-plan function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
