import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

function cleanInput(text: string | string[] | undefined | null): string {
  if (!text) return "";
  if (Array.isArray(text)) {
    return text.map(item => cleanInput(item)).join(", ");
  }
  const textStr = String(text);
  let cleanedText = textStr.replace(/[<>{}[\]"'`]/g, "");
  cleanedText = cleanedText.replace(/\s+/g, " ").trim();
  return cleanedText;
}

function buildDetailedPrompt(formData: any): string {
  const brand = cleanInput(formData.brand);
  const theme = cleanInput(formData.theme);
  const persona = cleanInput(formData.persona);
  const platform = cleanInput(formData.platform);
  const objective = cleanInput(formData.objective);
  const description = cleanInput(formData.description);
  const tones = Array.isArray(formData.tone) ? formData.tone : (formData.tone ? [formData.tone] : []);
  const additionalInfo = cleanInput(formData.additionalInfo);
  const hasReferenceImages = formData.referenceImages && Array.isArray(formData.referenceImages) && formData.referenceImages.length > 0;
  
  // Informações sobre origem das imagens
  const brandImagesCount = formData.brandImagesCount || 0;
  const userImagesCount = formData.userImagesCount || 0;
  const totalImages = hasReferenceImages ? formData.referenceImages.length : 0;

  // Advanced configurations
  const negativePrompt = cleanInput(formData.negativePrompt);
  const colorPalette = formData.colorPalette || 'auto';
  const lighting = formData.lighting || 'natural';
  const composition = formData.composition || 'auto';
  const cameraAngle = formData.cameraAngle || 'eye_level';
  const detailLevel = formData.detailLevel || 7;
  const mood = formData.mood || 'auto';

  const promptParts: string[] = [];

  // Instrução de uso de imagens de referência - mais clara e contextualizada
  if (hasReferenceImages) {
    let imageContext = `Você está recebendo ${totalImages} imagem(ns) de referência visual`;
    
    if (brandImagesCount > 0 && userImagesCount > 0) {
      imageContext += ` (${brandImagesCount} da identidade visual da marca + ${userImagesCount} de referência adicional)`;
    } else if (brandImagesCount > 0) {
      imageContext += ` da identidade visual da marca "${brand}"`;
    } else {
      imageContext += ` fornecidas pelo usuário`;
    }
    
    promptParts.push(
      `${imageContext}. ` +
      `CRÍTICO: As imagens de referência são APENAS BASE INSPIRACIONAL para criar uma NOVA IMAGEM AUTÊNTICA E ORIGINAL. ` +
      `NÃO copie ou replique diretamente as imagens de referência. ` +
      `INSTRUÇÕES DE CRIAÇÃO: ` +
      `1. IDENTIDADE VISUAL: ${brandImagesCount > 0 ? `Mantenha FORTE COERÊNCIA com a essência e DNA visual da marca ${brand} observados nas primeiras ${brandImagesCount} imagens, mas crie uma composição completamente nova` : 'Inspire-se no estilo visual das referências, mas crie algo original'} ` +
      `2. PALETA DE CORES: Extraia a paleta de cores dominante das referências e aplique de forma criativa e harmoniosa ` +
      `3. ESTILO GRÁFICO: Inspire-se no estilo visual, mas crie uma composição única e autêntica ` +
      `4. ATMOSFERA: Capture o mood e sensação das referências, mas interprete de forma original ` +
      `5. ORIGINALIDADE: A imagem final deve ser SUBSTANCIALMENTE DIFERENTE das referências, mantendo apenas a essência da identidade visual ` +
      `GERE uma imagem COMPLETAMENTE NOVA, AUTÊNTICA e ORIGINAL que seja inspirada (não copiada) pelas referências, ` +
      `capturando a essência da marca mas com uma execução visual única e criativa.`
    );
  }

  // Contexto estratégico
  if (brand) {
    if (theme) {
      promptParts.push(`Imagem profissional para a marca "${brand}", destacando o tema estratégico "${theme}".`);
    } else {
      promptParts.push(`Imagem comercial profissional para a marca "${brand}".`);
    }
  }

  // Descrição principal com fotorrealismo
  if (description) {
    promptParts.push(
      `Uma fotografia comercial de alta precisão e fotorrealismo, com atenção detalhada aos aspectos de iluminação e composição. ` +
      `A cena será meticulosamente projetada para capturar a luz natural de forma eficaz, utilizando uma combinação de fontes de luz suave e direta ` +
      `para criar um contraste harmonioso. Cada elemento da composição será cuidadosamente alinhado para otimizar a percepção visual. ` +
      `Seguindo a descrição: ${description}`
    );
  }

  // Tom e atmosfera
  const toneMap: { [key: string]: string } = {
    inspirador: "Cena iluminada pela luz dourada, com raios suaves atravessando o cenário. Atmosfera edificante e esperançosa, com sombras delicadas que sugerem crescimento.",
    motivacional: "Cores vibrantes e saturadas, com iluminação dinâmica e uso de motion blur leve para dar sensação de movimento. Composição energética que incentiva ação.",
    profissional: "Estética corporativa limpa, iluminação neutra, com foco nítido e fundo minimalista. Espacamento e equilíbrio para transmitir autoridade.",
    casual: "Luz natural suave, com elementos cotidianos e paleta de cores acolhedora. Composição descontraída e espontânea que transmite autenticidade.",
    elegante: "Paleta refinada, com iluminação suave e texturas nobres como mármore ou veludo. Composição minimalista que reflete sofisticação.",
    moderno: "Design arrojado com formas geométricas e alta contrastância. Iluminação intensa e elementos gráficos com estética futurista.",
    divertido: "Cores vibrantes, com elementos gráficos lúdicos e iluminação alegre. Composição enérgica que destaca diversão e criatividade.",
    minimalista: "Paleta monocromática ou neutra, com iluminação uniforme e composição limpa. Espaços negativos e simplicidade essencial."
  };

  if (tones.length > 0) {
    const mappedTones = tones
      .map((tone: string) => {
        const cleanTone = cleanInput(tone);
        return toneMap[cleanTone.toLowerCase()] || `com uma estética ${cleanTone} única e criativa`;
      })
      .join(", ");
    promptParts.push(`O clima da imagem é: ${mappedTones}`);
  }

  // Detalhes técnicos da câmera
  promptParts.push(
    "Detalhes técnicos: foto capturada com câmera DSLR de alta qualidade, lente de 85mm f/1.4. " +
    "Profundidade de campo rasa criando efeito bokeh suave no fundo, destacando o sujeito principal com estética profissional e cinematográfica."
  );

  // Otimização para plataforma
  const platformStyles: { [key: string]: string } = {
    instagram: "cores vibrantes, otimizado para engajamento no feed e stories",
    facebook: "composição envolvente, focada na comunidade e interação social",
    linkedin: "estética profissional e corporativa, ideal para posts de negócios",
    twitter: "design clean e chamativo, otimizado para visibilidade",
    x: "design clean e chamativo, otimizado para interações rápidas",
    tiktok: "composição dinâmica e energia jovem, formato vertical",
    youtube: "thumbnail de alto contraste, otimizado para aumentar visualizações"
  };

  if (platform && platformStyles[platform.toLowerCase()]) {
    promptParts.push(`Otimizado para ${platform}: ${platformStyles[platform.toLowerCase()]}`);
  }

  // Persona e informações adicionais
  if (persona) promptParts.push(`Conectando-se com a persona de ${persona}`);
  if (objective) promptParts.push(`Objetivo: ${objective}`);
  if (additionalInfo) promptParts.push(`Elementos visuais adicionais: ${additionalInfo}`);

  // Advanced configuration processing
  const colorPaletteDescriptions: { [key: string]: string } = {
    warm: "Paleta de cores quentes e acolhedoras: tons de laranja, vermelho, amarelo e dourado que transmitem energia e calor",
    cool: "Paleta de cores frias e serenas: tons de azul, verde, roxo e prata que transmitem calma e profissionalismo",
    monochrome: "Esquema monocromático sofisticado com variações tonais de uma única cor, criando harmonia visual",
    vibrant: "Cores vibrantes e saturadas de alto impacto visual, criando energia e dinamismo",
    pastel: "Paleta pastel suave e delicada com tons claros e arejados que transmitem leveza",
    earth: "Tons terrosos naturais: marrom, bege, verde musgo e terracota que transmitem autenticidade",
  };

  const lightingDescriptions: { [key: string]: string } = {
    natural: "Iluminação natural e realista simulando luz do dia, com sombras suaves e cores autênticas",
    studio: "Iluminação de estúdio profissional controlada e uniforme, sem sombras duras, ideal para produtos",
    golden_hour: "Iluminação Golden Hour mágica e cinematográfica com tons dourados e sombras longas e suaves",
    dramatic: "Iluminação dramática de alto contraste com sombras profundas e destaques brilhantes para impacto visual",
    soft: "Luz suave e difusa sem sombras duras, criando atmosfera delicada e profissional",
    backlight: "Iluminação contraluz criando efeito de halo e silhueta com borda luminosa",
    neon: "Iluminação neon vibrante e futurista com cores saturadas e glow effect",
  };

  const compositionDescriptions: { [key: string]: string } = {
    center: "Composição centralizada com o elemento principal no centro exato do quadro",
    rule_of_thirds: "Composição seguindo a regra dos terços com elementos-chave nos pontos de interesse visual",
    symmetric: "Composição perfeitamente simétrica criando equilíbrio e harmonia visual",
    asymmetric: "Composição assimétrica dinâmica com distribuição irregular de elementos para criar interesse",
    dynamic: "Composição dinâmica com linhas diagonais e movimento visual que guia o olhar",
    minimalist: "Composição minimalista clean com muito espaço negativo e poucos elementos essenciais",
  };

  const cameraAngleDescriptions: { [key: string]: string } = {
    eye_level: "Câmera ao nível dos olhos criando perspectiva natural e conexão direta com o espectador",
    top_down: "Vista superior flat lay perfeita para mostrar layout e organização de elementos",
    low_angle: "Ângulo baixo olhando para cima, criando sensação de grandeza e poder",
    high_angle: "Ângulo alto olhando para baixo, criando visão abrangente da cena",
    close_up: "Close-up extremo focando em detalhes e texturas com profundidade de campo rasa",
    wide_shot: "Plano geral amplo mostrando todo o contexto e ambiente da cena",
    dutch_angle: "Ângulo holandês inclinado criando tensão visual e dinamismo",
  };

  const moodDescriptions: { [key: string]: string } = {
    professional: "Atmosfera profissional e corporativa com elementos que transmitem autoridade e confiança",
    casual: "Atmosfera casual e descontraída com elementos cotidianos que transmitem autenticidade",
    elegant: "Atmosfera elegante e sofisticada com refinamento visual e luxo discreto",
    playful: "Atmosfera divertida e lúdica com elementos que evocam alegria e criatividade",
    serious: "Atmosfera séria e formal com elementos que transmitem importância e gravidade",
    mysterious: "Atmosfera misteriosa e intrigante com elementos de suspense visual",
    energetic: "Atmosfera energética e vibrante transbordando movimento e vitalidade",
    calm: "Atmosfera calma e serena transmitindo paz e tranquilidade",
  };

  const detailLevelDescriptions = [
    "Estilo ultra minimalista com elementos gráficos essenciais e espaços limpos",
    "Abordagem minimalista com poucos elementos cuidadosamente selecionados",
    "Design simplificado focando no essencial sem detalhes desnecessários",
    "Equilíbrio entre simplicidade e informação visual adequada",
    "Nível moderado de detalhes com elementos bem definidos",
    "Boa quantidade de detalhes visuais sem sobrecarregar",
    "Nível equilibrado de detalhes criando riqueza visual (PADRÃO RECOMENDADO)",
    "Rica em detalhes com texturas e elementos complementares visíveis",
    "Altamente detalhada com múltiplas camadas visuais e texturas complexas",
    "Extremamente detalhada com atenção meticulosa a cada elemento visual",
  ];

  // Apply advanced configurations
  if (colorPalette !== 'auto' && colorPaletteDescriptions[colorPalette]) {
    promptParts.push(colorPaletteDescriptions[colorPalette]);
  }

  if (lightingDescriptions[lighting]) {
    promptParts.push(lightingDescriptions[lighting]);
  }

  if (composition !== 'auto' && compositionDescriptions[composition]) {
    promptParts.push(compositionDescriptions[composition]);
  }

  if (cameraAngleDescriptions[cameraAngle]) {
    promptParts.push(cameraAngleDescriptions[cameraAngle]);
  }

  if (mood !== 'auto' && moodDescriptions[mood]) {
    promptParts.push(moodDescriptions[mood]);
  }

  if (detailLevel >= 1 && detailLevel <= 10) {
    promptParts.push(detailLevelDescriptions[detailLevel - 1]);
  }

  // Reforço de qualidade
  promptParts.push(
    `Criar uma imagem visualmente impactante, de alta qualidade, profissional e otimizada para ${platform || 'redes sociais'}. ` +
    `A composição deve ser eye-catching e capturar a essência da marca ${brand} no tema ${theme}.`
  );

  // Add negative prompt at the end if provided
  if (negativePrompt) {
    promptParts.push(`IMPORTANTE: Evitar absolutamente estes elementos: ${negativePrompt}`);
  }

  return promptParts.join(". ");
}

async function generateImageWithRetry(prompt: string, referenceImages: string[] | undefined, apiKey: string, isEdit: boolean = false, existingImage?: string, attempt: number = 1): Promise<any> {
  try {
    if (isEdit) {
      console.log(`✏️ Tentativa ${attempt}/${MAX_RETRIES} de edição de imagem com Gemini 2.5...`);
    } else {
      console.log(`🎨 Tentativa ${attempt}/${MAX_RETRIES} de geração com Gemini 2.5...`);
    }
    
    // Construir conteúdo da mensagem
    const messageContent: any[] = [];
    
    // Se for edição, adicionar a imagem existente primeiro
    if (isEdit && existingImage) {
      console.log(`📸 Editando imagem existente...`);
      messageContent.push({
        type: "image_url",
        image_url: {
          url: existingImage
        }
      });
    }
    
    // Adicionar imagens de referência (se houver e não for edição)
    // Priorizar imagens da marca, depois do usuário, com limite total de 5
    if (!isEdit && referenceImages && Array.isArray(referenceImages) && referenceImages.length > 0) {
      const maxImages = 5;
      const limitedImages = referenceImages.slice(0, maxImages);
      
      console.log(`📸 Processando ${limitedImages.length} de ${referenceImages.length} imagem(ns) de referência...`);
      
      let successCount = 0;
      for (const refImg of limitedImages) {
        try {
          // Validar formato base64
          if (!refImg.startsWith('data:image/')) {
            console.warn("⚠️ Imagem de referência em formato inválido, ignorando...");
            continue;
          }
          
          messageContent.push({
            type: "image_url",
            image_url: {
              url: refImg
            }
          });
          successCount++;
        } catch (refError) {
          console.error("❌ Erro ao processar imagem de referência:", refError);
        }
      }
      
      console.log(`✅ ${successCount} imagens adicionadas ao contexto com sucesso`);
      
      if (referenceImages.length > maxImages) {
        console.log(`ℹ️ Limitadas a ${maxImages} imagens (${referenceImages.length - maxImages} não processadas)`);
      }
    }
    
    // Adicionar o prompt de texto
    messageContent.push({
      type: "text",
      text: isEdit ? `Edite esta imagem aplicando as seguintes alterações: ${prompt}` : prompt
    });
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [{ role: "user", content: messageContent }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Erro na tentativa ${attempt}:`, response.status, errorText);
      
      if (response.status === 429) {
        throw new Error("RATE_LIMIT: Muitas requisições. Aguarde alguns segundos e tente novamente.");
      }
      if (response.status === 402) {
        throw new Error("PAYMENT_REQUIRED: Créditos insuficientes no Lovable AI.");
      }
      if (response.status === 400) {
        // Erro 400 geralmente indica problema com as imagens de referência
        throw new Error("IMAGE_PROCESSING_ERROR: Não foi possível processar as imagens de referência. Tente com menos imagens ou imagens menores.");
      }
      
      throw new Error(`AI_GATEWAY_ERROR: Erro ${response.status} ao gerar imagem.`);
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      throw new Error("NO_IMAGE_GENERATED");
    }

    console.log(`✅ Sucesso na tentativa ${attempt}/${MAX_RETRIES}`);
    return { imageUrl, attempt };
    
  } catch (error: any) {
    console.error(`❌ Falha na tentativa ${attempt}:`, error.message);
    
    // Erros que não devem ser retentados
    if (error.message?.includes("RATE_LIMIT") || 
        error.message?.includes("PAYMENT_REQUIRED") || 
        error.message?.includes("IMAGE_PROCESSING_ERROR")) {
      throw error;
    }
    
    // Se não é a última tentativa, aguarda e tenta novamente
    if (attempt < MAX_RETRIES) {
      const delay = attempt * RETRY_DELAY_MS;
      console.log(`⏳ Aguardando ${delay}ms antes da próxima tentativa...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return generateImageWithRetry(prompt, referenceImages, apiKey, isEdit, existingImage, attempt + 1);
    }
    
    // Última tentativa falhou
    console.error(`💥 Todas as ${MAX_RETRIES} tentativas falharam`);
    throw new Error(`Não foi possível gerar a imagem após ${MAX_RETRIES} tentativas. ${error.message}`);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log('🎨 [GENERATE-IMAGE] Iniciando geração de imagem');

  try {
    // Autenticar usuário
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error('❌ [GENERATE-IMAGE] Token de autenticação não fornecido');
      return new Response(
        JSON.stringify({ error: 'Token de autenticação não fornecido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('❌ [GENERATE-IMAGE] Falha na autenticação:', {
        error: authError?.message,
        hasUser: !!user
      });
      return new Response(
        JSON.stringify({ 
          error: 'Falha na autenticação. Por favor, faça login novamente.',
          details: authError?.message 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ [GENERATE-IMAGE] Usuário autenticado: ${user.id}`);

    // Buscar team_id do usuário
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('team_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.team_id) {
      console.error('❌ [GENERATE-IMAGE] Usuário sem equipe:', profileError);
      return new Response(
        JSON.stringify({ error: 'Usuário não está associado a uma equipe' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ [GENERATE-IMAGE] Team ID: ${profile.team_id}`);

    // Verificar créditos disponíveis
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .select('credits_suggestions')
      .eq('id', profile.team_id)
      .single();

    if (teamError || !teamData) {
      console.error('❌ [GENERATE-IMAGE] Erro ao verificar créditos:', teamError);
      return new Response(
        JSON.stringify({ error: 'Não foi possível verificar créditos disponíveis' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`💰 [GENERATE-IMAGE] Créditos disponíveis: ${teamData.credits_suggestions}`);

    if (teamData.credits_suggestions <= 0) {
      console.warn('⚠️ [GENERATE-IMAGE] Créditos insuficientes');
      return new Response(
        JSON.stringify({ error: 'Créditos insuficientes para criação de conteúdo' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const formData = await req.json();
    
    // Input validation
    if (!formData || typeof formData !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Dados do formulário inválidos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!formData.description || typeof formData.description !== 'string' || formData.description.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Descrição é obrigatória' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (formData.description.length > 2000) {
      return new Response(
        JSON.stringify({ error: 'Descrição muito longa (máximo 2000 caracteres)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (formData.additionalInfo && typeof formData.additionalInfo === 'string' && formData.additionalInfo.length > 2000) {
      return new Response(
        JSON.stringify({ error: 'Informações adicionais muito longas' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validar número de imagens (máximo 5 para não sobrecarregar o modelo)
    if (formData.referenceImages && (!Array.isArray(formData.referenceImages) || formData.referenceImages.length > 10)) {
      return new Response(
        JSON.stringify({ error: 'Too many reference images sent (max 10, will use first 5)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Service configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se é edição de imagem existente
    const isEdit = formData.isEdit === true && formData.existingImage;
    
    // Construir prompt
    let prompt: string;
    if (isEdit) {
      prompt = cleanInput(formData.description);
    } else {
      prompt = buildDetailedPrompt(formData);
    }

    // Gerar ou editar imagem com sistema de retry
    try {
      const result = await generateImageWithRetry(
        prompt, 
        formData.referenceImages, 
        LOVABLE_API_KEY, 
        isEdit, 
        formData.existingImage
      );
      
      console.log(`✅ [GENERATE-IMAGE] Image generated successfully in ${result.attempt} attempt(s)`);

      // Decrementar crédito após geração bem-sucedida
      const newCredits = teamData.credits_suggestions - 1;
      const { error: updateError } = await supabase
        .from('teams')
        .update({ credits_suggestions: newCredits })
        .eq('id', profile.team_id);

      if (updateError) {
        console.error('❌ [GENERATE-IMAGE] Failed to update credits:', updateError);
        // Não falhar a requisição, apenas logar o erro
      } else {
        console.log(`💰 [GENERATE-IMAGE] Credits updated: ${teamData.credits_suggestions} → ${newCredits}`);
      }
      
      return new Response(
        JSON.stringify({ 
          imageUrl: result.imageUrl,
          attempt: result.attempt,
          model: "google/gemini-2.5-flash-image-preview",
          remainingCredits: newCredits
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
      
    } catch (error: any) {
      if (error.message === "RATE_LIMIT") {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (error.message === "PAYMENT_REQUIRED") {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: 'Unable to generate image after retries' }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error) {
    return new Response(
      JSON.stringify({ error: 'Unable to generate image' }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
