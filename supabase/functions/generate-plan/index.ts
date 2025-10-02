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
    const systemPrompt = `Você é um especialista em planejamento de conteúdo estratégico para redes sociais. Sua tarefa é criar planos de conteúdo detalhados, estruturados e altamente acionáveis seguindo o formato abaixo:

# ESTRUTURA DO PLANO DE CONTEÚDO

## 1. OBJETIVOS DE NEGÓCIO
Liste 3-4 objetivos claros e mensuráveis alinhados com a marca

## 2. UNIVERSOS-ALVO
Descreva as principais personas/públicos-alvo e suas necessidades específicas

## 3. PILARES EDITORIAIS (70/20/10)
- 70% Educação/Autoridade
- 20% Prova social/Produto
- 10% Cultura/Brand

## 4. MÍDIAS & CADÊNCIA
Defina frequência e tipo de conteúdo para a plataforma selecionada

## 5. CALENDÁRIO SUGERIDO
Organize os posts em semanas com sugestão de horários para publicação

## 6. SUGESTÕES DE POSTS
Para cada post sugerido (até ${quantity} posts), inclua:

### Post [Número] - [Título Descritivo]
- **Objetivo:** [objetivo específico do post]
- **Funnel:** [Topo/Meio/Fundo]
- **Persona:** [público-alvo específico]
- **Grande Ideia:** [conceito principal em uma frase]
- **Formato:** [tipo de conteúdo - carrossel/vídeo/reels/etc]
- **Estrutura/Roteiro:**
  1. Hook (primeiros segundos): [texto exato]
  2. Desenvolvimento: [pontos principais]
  3. Prova/Valor: [dados, exemplos, benefícios]
  4. Fecho: [CTA ou conclusão]
- **Legenda/Copy:** [texto completo da legenda]
- **CTA:** [chamada para ação específica]
- **Brief de Arte:** [descrição visual detalhada]
- **Hashtags:** [5-8 hashtags relevantes]
- **Distribuição:** [estratégia de divulgação]
- **Métrica-chave:** [KPI principal para medir sucesso]

IMPORTANTE:
- Seja específico e detalhado em cada seção
- Use dados e insights reais quando disponíveis
- Mantenha tom profissional mas acessível
- Inclua CTAs claros e mensuráveis
- Sugira horários baseados no público-alvo
- Forneça roteiros completos e acionáveis`;

    const userPrompt = `Crie um plano de conteúdo completo e detalhado com as seguintes especificações:

**MARCA:** ${brandData?.name || brand}
${brandData ? `
**Segmento:** ${brandData.segment}
**Valores:** ${brandData.values}
**Objetivos da Marca:** ${brandData.goals}
**Palavras-chave:** ${brandData.keywords}
${brandData.promise ? `**Promessa de Marca:** ${brandData.promise}` : ''}
` : ''}

**TEMAS ESTRATÉGICOS:**
${themeData?.map((t: any, i: number) => `
${i + 1}. ${t.title}
   - Descrição: ${t.description}
   - Objetivos: ${t.objectives}
   - Público-alvo: ${t.target_audience}
   - Tom de voz: ${t.tone_of_voice}
   - Formatos ideais: ${t.best_formats}
   - Ação esperada: ${t.expected_action}
`).join('\n') || themes.join(', ')}

**PLATAFORMA:** ${platform}
**QUANTIDADE DE POSTS:** ${quantity}
**OBJETIVO DO PLANEJAMENTO:** ${objective}
${additionalInfo ? `**INFORMAÇÕES ADICIONAIS:** ${additionalInfo}` : ''}

Gere um plano de conteúdo extremamente detalhado seguindo EXATAMENTE a estrutura fornecida no sistema prompt. Seja específico, criativo e forneça roteiros completos para cada post.`;

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
        max_completion_tokens: 4000,
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
