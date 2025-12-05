import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { CREDIT_COSTS } from '../_shared/creditCosts.ts';
import { recordCreditUsage } from '../_shared/creditHistory.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY não configurada');
      return new Response(
        JSON.stringify({ error: 'Chave da API Lovable AI não configurada.' }),
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
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const body = await req.json();
    const { prompt, originalTitle, originalBody, originalHashtags, brand, theme, brandId, teamId, userId } = body;

    // Validate required fields
    if (!prompt || !originalTitle || !originalBody || !originalHashtags || !brandId || !teamId || !userId) {
      return new Response(
        JSON.stringify({ error: 'Dados insuficientes para a revisão.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('📝 Verificando créditos do time:', teamId);

    // Check team credits
    const { data: teamData, error: teamError } = await supabaseClient
      .from('teams')
      .select('credits')
      .eq('id', teamId)
      .single();

    if (teamError) {
      console.error('Erro ao buscar créditos:', teamError);
      return new Response(
        JSON.stringify({ error: 'Erro ao verificar créditos' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!teamData || teamData.credits <= 0) {
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
        
        // Use tool calling for structured JSON output
        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [{ role: 'user', content: textPrompt }],
            tools: [
              {
                type: "function",
                function: {
                  name: "revise_caption",
                  description: "Return the revised post content in structured format",
                  parameters: {
                    type: "object",
                    properties: {
                      title: { type: "string", description: "The revised title for the post" },
                      body: { type: "string", description: "The revised body/caption for the post with line breaks as \\n" },
                      hashtags: { 
                        type: "array", 
                        items: { type: "string" },
                        description: "Array of hashtags without the # symbol"
                      }
                    },
                    required: ["title", "body", "hashtags"],
                    additionalProperties: false
                  }
                }
              }
            ],
            tool_choice: { type: "function", function: { name: "revise_caption" } },
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('Erro da API Lovable AI:', response.status, errorText);
          
          if (response.status === 429) {
            return new Response(
              JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns instantes.' }),
              { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          if (response.status === 402) {
            return new Response(
              JSON.stringify({ error: 'Créditos de IA insuficientes. Por favor, adicione créditos ao workspace.' }),
              { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
          
          throw new Error(`Lovable AI API error: ${response.status}`);
        }

        const data = await response.json();
        
        // Extract from tool call response
        const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
        if (toolCall?.function?.arguments) {
          revisedContent = JSON.parse(toolCall.function.arguments);
        } else {
          // Fallback: try to parse from content
          const rawContent = data.choices?.[0]?.message?.content;
          if (rawContent) {
            revisedContent = JSON.parse(rawContent);
          } else {
            throw new Error('Resposta vazia da API Lovable AI');
          }
        }

        if (!revisedContent.title || !revisedContent.body || !Array.isArray(revisedContent.hashtags)) {
          throw new Error("Formato de JSON inválido recebido da IA.");
        }

        success = true;
        console.log('✅ Legenda revisada com sucesso');
        
      } catch (error: any) {
        retryCount++;
        console.error(`Erro na tentativa ${retryCount}:`, error.message);
        
        if (error.message?.includes('overloaded') ||
            error.message?.includes('rate limit') ||
            error.message?.includes('too many requests')) {

          if (retryCount < maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, retryCount), 30000);
            console.log(`Aguardando ${delay}ms antes da próxima tentativa...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        } else if (retryCount < maxRetries) {
          const delay = 2000;
          console.log(`Aguardando ${delay}ms antes da próxima tentativa...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          throw error;
        }
      }
    }

    if (!success) {
      throw new Error(`Falha ao refatorar texto após ${maxRetries} tentativas. O modelo pode estar sobrecarregado.`);
    }

    // Save action to history
    const { data: actionData, error: actionError } = await supabaseClient
      .from('actions')
      .insert({
        type: 'revisar_legenda',
        team_id: teamId,
        brand_id: brandId,
        user_id: userId,
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

    // Deduct credit
    const creditsBefore = teamData.credits;
    const creditsAfter = creditsBefore - CREDIT_COSTS.CAPTION_REVIEW;
    
    const { error: updateError } = await supabaseClient
      .from('teams')
      .update({ credits: creditsAfter })
      .eq('id', teamId);

    if (updateError) {
      console.error('Erro ao deduzir crédito:', updateError);
    }

    // Record credit usage
    await recordCreditUsage(supabaseClient, {
      teamId,
      userId,
      actionType: 'CAPTION_REVIEW',
      creditsUsed: CREDIT_COSTS.CAPTION_REVIEW,
      creditsBefore,
      creditsAfter,
      description: 'Revisão de legenda (Lovable AI)',
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
    console.error('Erro na função revise-caption:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
