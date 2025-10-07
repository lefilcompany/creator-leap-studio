import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.58.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_PROMPT_LENGTH = 3950;

function cleanInput(text: string | undefined | null): string {
  if (!text) return '';
  let cleanedText = text.replace(/[<>{}\[\]"`]/g, '');
  cleanedText = cleanedText.replace(/\s+/g, ' ').trim();
  return cleanedText;
}

function buildRevisionPrompt(
  adjustment: string, 
  brandData: any, 
  themeData: any | null,
  hasLogo: boolean
): string {
  let promptParts: string[] = [
    "Atue como um diretor de arte e especialista em design para mídias sociais. Sua tarefa é refinar a imagem fornecida, mantendo a composição original, mas aplicando os ajustes solicitados e garantindo total alinhamento com a identidade da marca e as diretrizes do tema estratégico.",
    `Ajuste solicitado pelo usuário: "${cleanInput(adjustment)}". Aplique esta alteração de forma sutil e integrada à imagem.`
  ];

  if (hasLogo) {
    promptParts.push(
      "\n--- INSTRUÇÃO DE LOGO (IMPORTANTE) ---",
      "A marca possui um logo definido. Se apropriado para o contexto, mantenha espaço para o logo ou garanta que a estética da imagem esteja alinhada com a identidade visual da marca representada pelo logo."
    );
  }

  if (brandData) {
    promptParts.push("\n--- DIRETRIZES DE IDENTIDADE DA MARCA (OBRIGATÓRIO SEGUIR) ---");
    
    if (brandData.name) promptParts.push(`Nome da Marca (Obrigatório): ${cleanInput(brandData.name)}`);
    if (brandData.values) promptParts.push(`Valores (Obrigatório): ${cleanInput(brandData.values)}`);
    if (brandData.segment) promptParts.push(`Segmento (Obrigatório): ${cleanInput(brandData.segment)}`);
    if (brandData.promise) promptParts.push(`Promessa Única (Obrigatório): ${cleanInput(brandData.promise)}`);
    if (brandData.restrictions) promptParts.push(`Restrições - o que NÃO fazer (Obrigatório): ${cleanInput(brandData.restrictions)}`);
    if (brandData.keywords) promptParts.push(`Palavras-chave: ${cleanInput(brandData.keywords)}`);
    if (brandData.goals) promptParts.push(`Metas de negócio (Obrigatório): ${cleanInput(brandData.goals)}`);
    if (brandData.success_metrics) promptParts.push(`Indicadores de sucesso (Obrigatório): ${cleanInput(brandData.success_metrics)}`);
    if (brandData.inspirations) promptParts.push(`Inspirações: ${cleanInput(brandData.inspirations)}`);
    
    if (brandData.color_palette) {
      try {
        const colors = typeof brandData.color_palette === 'string' 
          ? JSON.parse(brandData.color_palette) 
          : brandData.color_palette;
        promptParts.push(`Paleta de Cores da Marca: ${JSON.stringify(colors)}. Use estas cores de forma harmoniosa.`);
      } catch (e) {
        console.error('Erro ao processar paleta de cores:', e);
      }
    }
  }

  if (themeData) {
    promptParts.push("\n--- DIRETRIZES DO TEMA ESTRATÉGICO (OBRIGATÓRIO SEGUIR) ---");
    
    if (themeData.title) promptParts.push(`Título do Tema (Obrigatório): ${cleanInput(themeData.title)}`);
    if (themeData.description) promptParts.push(`Descrição: ${cleanInput(themeData.description)}`);
    if (themeData.tone_of_voice) promptParts.push(`Tom de Voz (Obrigatório): ${cleanInput(themeData.tone_of_voice)}`);
    if (themeData.objectives) promptParts.push(`Objetivos do Tema (Obrigatório): ${cleanInput(themeData.objectives)}`);
    if (themeData.content_format) promptParts.push(`Formatos de Conteúdo (Obrigatório): ${cleanInput(themeData.content_format)}`);
    if (themeData.expected_action) promptParts.push(`Ação Esperada do Público (Obrigatório): ${cleanInput(themeData.expected_action)}`);
    if (themeData.target_audience) promptParts.push(`Público-alvo: ${cleanInput(themeData.target_audience)}`);
    if (themeData.hashtags) promptParts.push(`Hashtags: ${cleanInput(themeData.hashtags)}`);
    if (themeData.color_palette) promptParts.push(`Paleta de Cores do Tema: ${themeData.color_palette}. Priorize estas cores, se aplicável.`);
  }

  promptParts.push("\n--- INSTRUÇÃO FINAL ---");
  promptParts.push("Refine a imagem com alta qualidade, realismo e impacto visual, mantendo os elementos principais da imagem original, mas garantindo que as diretrizes de marca e tema acima sejam perfeitamente refletidas no resultado final.");

  const finalPrompt = promptParts.join('\n');
  return finalPrompt.length > MAX_PROMPT_LENGTH ? finalPrompt.substring(0, MAX_PROMPT_LENGTH) : finalPrompt;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reviewPrompt, imageUrl, brandId, themeId } = await req.json();

    console.log('📝 [EDIT-IMAGE] Dados recebidos:', {
      brandId,
      themeId,
      hasImageUrl: !!imageUrl,
      promptLength: reviewPrompt?.length || 0
    });

    if (!reviewPrompt || !imageUrl || !brandId) {
      return new Response(
        JSON.stringify({ error: 'reviewPrompt, imageUrl e brandId são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('❌ Configuração do Supabase não encontrada');
      return new Response(
        JSON.stringify({ error: 'Configuração do servidor incompleta' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch complete brand data
    console.log('🔍 Buscando dados da marca...');
    const { data: brandData, error: brandError } = await supabase
      .from('brands')
      .select('*')
      .eq('id', brandId)
      .single();

    if (brandError || !brandData) {
      console.error('❌ Erro ao buscar marca:', brandError);
      return new Response(
        JSON.stringify({ error: 'Marca não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch theme data if themeId is provided
    let themeData = null;
    if (themeId) {
      console.log('🔍 Buscando dados do tema...');
      const { data, error: themeError } = await supabase
        .from('strategic_themes')
        .select('*')
        .eq('id', themeId)
        .single();

      if (!themeError && data) {
        themeData = data;
      }
    }

    // Build detailed prompt with brand and theme context
    const hasLogo = !!brandData.logo;
    const detailedPrompt = buildRevisionPrompt(reviewPrompt, brandData, themeData, hasLogo);

    console.log('📝 Prompt construído com', detailedPrompt.length, 'caracteres');

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      console.error('❌ LOVABLE_API_KEY não configurada');
      return new Response(
        JSON.stringify({ error: 'API key não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🤖 Chamando Lovable AI para edição de imagem...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: detailedPrompt
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
        modalities: ['image', 'text']
      })
    });

    console.log('📡 Status da resposta Lovable AI:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro na API Lovable AI:', errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns minutos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes. Adicione créditos ao seu workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const aiData = await response.json();
    console.log('✅ Resposta da AI recebida');

    const editedImageBase64 = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!editedImageBase64) {
      console.error('❌ Imagem editada não foi retornada pela API');
      throw new Error('Imagem editada não foi retornada pela API');
    }

    console.log('📤 Fazendo upload da imagem editada para Storage...');

    // Extract base64 data from data URL
    const base64Data = editedImageBase64.split(',')[1] || editedImageBase64;
    
    // Convert base64 to Uint8Array
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Generate unique filename
    const timestamp = Date.now();
    const randomId = crypto.randomUUID();
    const fileName = `edited-images/${timestamp}-${randomId}.png`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('content-images')
      .upload(fileName, bytes, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('❌ Erro ao fazer upload:', uploadError);
      throw new Error(`Erro ao fazer upload da imagem: ${uploadError.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('content-images')
      .getPublicUrl(fileName);

    console.log('✅ Imagem editada com sucesso e armazenada:', publicUrl);

    return new Response(
      JSON.stringify({ editedImageUrl: publicUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Erro em edit-image:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro ao editar imagem' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
