import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { CREDIT_COSTS } from '../_shared/creditCosts.ts';
import { checkUserCredits, deductUserCredits, recordUserCreditUsage } from '../_shared/userCredits.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      console.error('OPENAI_API_KEY não configurada');
      return new Response(
        JSON.stringify({ error: 'Chave da API OpenAI não configurada.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Autenticação necessária' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Authenticate user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { prompt, originalTitle, originalBody, originalHashtags, brand, theme, brandId, teamId, userId } = body;

    // Validate required fields
    if (!prompt || !originalTitle || !originalBody || !originalHashtags || !brandId) {
      return new Response(
        JSON.stringify({ error: 'Dados insuficientes para a revisão.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📝 Verificando créditos do usuário:', user.id);

    // Check user credits (individual)
    const creditCheck = await checkUserCredits(supabase, user.id, CREDIT_COSTS.CAPTION_REVIEW);

    if (!creditCheck.hasCredits) {
      return new Response(
        JSON.stringify({ error: 'Créditos de revisão insuficientes' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const textPrompt = `
# Tarefa: Refinar um post de mídia social.
## Contexto Original:
- **Marca**: ${brand || 'N/A'}
- **Tema**: ${theme || 'N/A'}
- **Título Original**: ${originalTitle}
- **Legenda Original**: ${originalBody}
- **Hashtags Originais**: ${originalHashtags.join(', ')}

## Instrução de Ajuste do Usuário:
"${prompt}"

## Sua Missão:
Com base na instrução do usuário, gere uma nova versão do post.
Responda ESTRITAMENTE em formato JSON com as chaves "title", "body" (legenda com quebras de linha \\n), e "hashtags" (um array de strings sem '#'). Mantenha a estrutura, mas aplique as melhorias solicitadas.
`;

    const maxRetries = 5;
    let retryCount = 0;
    let success = false;
    let revisedContent;

    while (!success && retryCount < maxRetries) {
      try {
        console.log(`Tentativa ${retryCount + 1} de ${maxRetries} para revisar legenda`);
        
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: textPrompt }],
            response_format: { type: "json_object" },
            temperature: 0.7,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Erro da API OpenAI:', response.status, errorText);
          throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        const rawContent = data.choices?.[0]?.message?.content;
        
        if (!rawContent) {
          throw new Error('Resposta vazia da API OpenAI');
        }

        revisedContent = JSON.parse(rawContent);

        if (!revisedContent.title || !revisedContent.body || !Array.isArray(revisedContent.hashtags)) {
          throw new Error("Formato de JSON inválido recebido da IA.");
        }

        success = true;
        console.log('✅ Legenda revisada com sucesso');
        
      } catch (error: any) {
        retryCount++;
        console.error(`Erro na tentativa ${retryCount}:`, error.message);
        
        if (error.status === 503 ||
            error.message?.includes('overloaded') ||
            error.message?.includes('rate limit') ||
            error.message?.includes('too many requests')) {

          if (retryCount < maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
            console.log(`Aguardando ${delay}ms antes da próxima tentativa...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        } else {
          throw error;
        }
      }
    }

    if (!success) {
      throw new Error(`Falha ao refatorar texto após ${maxRetries} tentativas. O modelo pode estar sobrecarregado.`);
    }

    // Save action to history
    const { data: actionData, error: actionError } = await supabase
      .from('actions')
      .insert({
        type: 'revisar_legenda',
        team_id: teamId || '00000000-0000-0000-0000-000000000000',
        brand_id: brandId,
        user_id: user.id,
        details: {
          prompt,
          originalTitle,
          originalBody,
          originalHashtags,
          brand,
          theme
        },
        result: revisedContent
      })
      .select()
      .single();

    if (actionError) {
      console.error('Erro ao salvar ação no histórico:', actionError);
    }

    // Deduct credit (individual)
    const deductResult = await deductUserCredits(supabase, user.id, CREDIT_COSTS.CAPTION_REVIEW);
    
    if (!deductResult.success) {
      console.error('Erro ao deduzir crédito:', deductResult.error);
    }

    // Record credit usage
    await recordUserCreditUsage(supabase, {
      userId: user.id,
      teamId: teamId || null,
      actionType: 'CAPTION_REVIEW',
      creditsUsed: CREDIT_COSTS.CAPTION_REVIEW,
      creditsBefore: creditCheck.currentCredits,
      creditsAfter: deductResult.newCredits,
      description: 'Revisão de legenda (OpenAI)',
      metadata: { brand, theme }
    });

    console.log('✅ Revisão concluída e salva no histórico');

    return new Response(
      JSON.stringify({ 
        ...revisedContent,
        actionId: actionData?.id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro desconhecido';
    console.error('Erro na função revise-caption-openai:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
