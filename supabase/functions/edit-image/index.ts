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
  brandData: any | null, 
  themeData: any | null,
  hasLogo: boolean
): string {
  let promptParts: string[] = [
    "Atue como um diretor de arte e especialista em design para mídias sociais.",
    "IMPORTANTE: Mantenha a composição e elementos principais da imagem original. Faça APENAS os ajustes solicitados pelo usuário, sem alterar completamente a imagem.",
    `Ajuste solicitado: "${cleanInput(adjustment)}". Aplique esta alteração de forma sutil e integrada à imagem existente.`
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
  
  if (brandData || themeData) {
    promptParts.push("Refine a imagem com alta qualidade, realismo e impacto visual, mantendo os elementos principais da imagem original, mas garantindo que as diretrizes de marca e tema acima sejam perfeitamente refletidas no resultado final.");
  } else {
    promptParts.push("Refine a imagem com alta qualidade, realismo e impacto visual, mantendo EXATAMENTE a composição e elementos principais da imagem original. Faça apenas o ajuste solicitado pelo usuário.");
  }

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

    if (!reviewPrompt || !imageUrl) {
      return new Response(
        JSON.stringify({ error: 'reviewPrompt e imageUrl são obrigatórios' }),
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

    // Fetch complete brand data if brandId is provided
    let brandData = null;
    if (brandId) {
      console.log('🔍 Buscando dados da marca...');
      const { data, error: brandError } = await supabase
        .from('brands')
        .select('*')
        .eq('id', brandId)
        .single();

      if (brandError) {
        console.error('⚠️ Erro ao buscar marca:', brandError);
      } else {
        brandData = data;
      }
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
    const hasLogo = brandData?.logo ? true : false;
    const detailedPrompt = buildRevisionPrompt(reviewPrompt, brandData, themeData, hasLogo);

    console.log('📝 Prompt construído com', detailedPrompt.length, 'caracteres');

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    
    if (!GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY não configurada');
      return new Response(
        JSON.stringify({ error: 'API key não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('🤖 Chamando Gemini API para edição de imagem...');

    // Converter imageUrl para base64
    const imageBase64 = imageUrl.split(',')[1];
    const imageMime = imageUrl.match(/data:(.*?);/)?.[1] || 'image/png';

    const response = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: detailedPrompt },
            { 
              inlineData: { 
                mimeType: imageMime, 
                data: imageBase64 
              } 
            }
          ]
        }],
        generationConfig: {
          temperature: 0.7,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 8192,
        }
      })
    });

    console.log('📡 Status da resposta Gemini API:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erro na API Gemini:', errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns minutos.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`API error: ${response.status} - ${errorText}`);
    }

    const aiData = await response.json();
    console.log('✅ Resposta da AI recebida');

    // Extrair imagem da resposta do Gemini
    const geminiImageData = aiData.candidates?.[0]?.content?.parts?.find(
      (part: any) => part.inlineData
    )?.inlineData;
    
    if (!geminiImageData) {
      console.error('❌ Imagem editada não foi retornada pela API');
      console.error('📊 Dados recebidos:', JSON.stringify(aiData, null, 2));
      throw new Error('Imagem editada não foi retornada pela API');
    }

    const editedImageBase64 = `data:${geminiImageData.mimeType};base64,${geminiImageData.data}`;

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
