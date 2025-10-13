import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
  
  // Dimensões customizadas (com validação)
  let customWidth = formData.width ? parseInt(formData.width) : null;
  let customHeight = formData.height ? parseInt(formData.height) : null;
  
  // Validar dimensões (512-2048px, múltiplos de 64)
  if (customWidth) {
    customWidth = Math.max(512, Math.min(2048, Math.round(customWidth / 64) * 64));
  }
  if (customHeight) {
    customHeight = Math.max(512, Math.min(2048, Math.round(customHeight / 64) * 64));
  }

  const promptParts: string[] = [];

  // === COMPLIANCE COM REGULAMENTAÇÃO PUBLICITÁRIA BRASILEIRA (CONAR/CDC) ===
  const complianceGuidelines = [
    "DIRETRIZES ÉTICAS E LEGAIS OBRIGATÓRIAS (Código CONAR e CDC - Brasil):",
    "1. HONESTIDADE E VERACIDADE: A imagem NÃO PODE induzir ao erro ou enganar sobre características do produto/serviço. Evite exageros visuais impossíveis, representações irreais de resultados, ou qualquer elemento que possa criar falsas expectativas. Se mostrar benefícios, eles devem ser plausíveis e comprováveis visualmente.",
    "2. RESPEITO E DIGNIDADE HUMANA: PROIBIDO qualquer forma de discriminação (racial, étnica, social, gênero, orientação sexual, religiosa, etária, deficiência física). NÃO retrate estereótipos depreciativos. Respeite símbolos nacionais, religiosos e culturais. NÃO explore o medo como apelo (exceto campanhas de interesse público). NÃO sugira ou mostre violência, crueldade ou situações de risco à segurança. NÃO explore superstições de forma manipuladora.",
    "3. PROTEÇÃO DE PÚBLICOS VULNERÁVEIS (Crianças/Adolescentes): Se o público-alvo incluir menores, aplique restrições MÁXIMAS. NÃO faça apelo direto de compra para crianças. NÃO mostre situações que possam constranger pais a comprar. NÃO apresente crianças em situações perigosas, inadequadas ou constrangedoras. NÃO use linguagem imperativa direcionada a crianças.",
    "4. BEBIDAS ALCOÓLICAS (Se aplicável): NUNCA mostre ou sugira o ato de consumo/ingestão da bebida. NÃO associe álcool a: sucesso profissional/social/sexual, condução de veículos, práticas esportivas, maturidade ou virilidade. NÃO sugira que o álcool melhora desempenho ou resolve problemas. Pessoas mostradas devem aparentar claramente mais de 25 anos.",
    "5. ALIMENTOS E BEBIDAS: NÃO estimule consumo excessivo ou compulsivo. Se mostrar alegações nutricionais/funcionais, mantenha proporcionalidade visual realista. NÃO crie falsas expectativas sobre efeitos de saúde. Porções devem ser realistas e proporcionais.",
    "6. APOSTAS E JOGOS (Se aplicável): OBRIGATÓRIO incluir símbolo 18+ de forma visível e legível. Pessoas representadas devem aparentar MAIS de 21 anos. NÃO apresente apostas como solução para problemas financeiros. NÃO mostre enriquecimento fácil ou garantido. NÃO associe apostas a sucesso social ou sexual.",
    "7. APELOS DE SUSTENTABILIDADE: Se houver elementos eco ou sustentáveis, eles devem ser REALISTAS e COMPROVÁVEIS. NÃO faça greenwashing (falsas alegações ambientais). Benefícios ambientais devem ser específicos, não genéricos ou vagos. NÃO exagere impactos positivos ao meio ambiente.",
    "8. COMPARAÇÃO COM CONCORRENTES: Se comparar produtos/marcas, seja OBJETIVO e baseado em fatos visuais. NÃO ridicularize, deprecie ou denigra concorrentes. Mantenha lealdade concorrencial e respeito.",
    "9. DECÊNCIA E PADRÕES SOCIAIS: Respeite padrões contemporâneos de decência da sociedade brasileira. NÃO use nudez excessiva ou erotização desnecessária. Linguagem visual deve ser apropriada para o público-alvo.",
    "ESTAS DIRETRIZES SÃO INVIOLÁVEIS E DEVEM SER APLICADAS EM TODA E QUALQUER IMAGEM GERADA, INDEPENDENTEMENTE DO CONTEXTO. EM CASO DE DÚVIDA SOBRE CONFORMIDADE, OPTE PELA INTERPRETAÇÃO MAIS CONSERVADORA E ÉTICA."
  ];
  
  promptParts.push(complianceGuidelines.join(" "));

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

  // Otimização para plataforma com specs detalhadas
  const platformImageSpecs: { [key: string]: any } = {
    Instagram: {
      feed: { width: 1080, height: 1350, ratio: "4:5", desc: "Feed vertical - maior engajamento" },
      story: { width: 1080, height: 1920, ratio: "9:16", desc: "Stories/Reels - tela cheia" },
      square: { width: 1080, height: 1080, ratio: "1:1", desc: "Quadrado - versátil" }
    },
    Facebook: {
      feed: { width: 1200, height: 630, ratio: "1.91:1", desc: "Feed/Links padrão" },
      square: { width: 1080, height: 1080, ratio: "1:1", desc: "Quadrado" }
    },
    TikTok: {
      video: { width: 1080, height: 1920, ratio: "9:16", desc: "Formato vertical nativo" }
    },
    "Twitter/X": {
      feed: { width: 1600, height: 900, ratio: "16:9", desc: "Feed otimizado" }
    },
    LinkedIn: {
      feed: { width: 1200, height: 627, ratio: "1.91:1", desc: "Feed profissional" }
    },
    Comunidades: {
      universal: { width: 1080, height: 1080, ratio: "1:1", desc: "Formato universal" }
    }
  };

  // Determinar dimensões finais (priorizar customizadas)
  let finalWidth: number;
  let finalHeight: number;
  let dimensionSource: string;
  
  if (customWidth && customHeight) {
    // Usar dimensões customizadas
    finalWidth = customWidth;
    finalHeight = customHeight;
    dimensionSource = "customizadas";
  } else if (platform) {
    // Usar specs da plataforma
    const platformSpec = platformImageSpecs[platform];
    if (platformSpec) {
      const specKey = Object.keys(platformSpec)[0];
      const spec = platformSpec[specKey];
      finalWidth = spec.width;
      finalHeight = spec.height;
      dimensionSource = `plataforma ${platform}`;
    } else {
      finalWidth = 1080;
      finalHeight = 1080;
      dimensionSource = "padrão";
    }
  } else {
    // Fallback padrão
    finalWidth = 1080;
    finalHeight = 1080;
    dimensionSource = "padrão";
  }
  
  const ratio = finalWidth / finalHeight;
  const ratioString = ratio > 1 ? `${ratio.toFixed(2)}:1` : `1:${(1/ratio).toFixed(2)}`;
  
  if (platform) {
    const platformSpec = platformImageSpecs[platform];
    if (platformSpec) {
      const specKey = Object.keys(platformSpec)[0];
      const spec = platformSpec[specKey];
      
      promptParts.push(
        `Otimizado para ${platform}: ${spec.desc}. ` +
        `Gerar imagem em dimensões ${finalWidth}x${finalHeight}px (aspect ratio ${ratioString})${dimensionSource === "customizadas" ? " - dimensões customizadas" : ""}. ` +
        `${platform === 'Instagram' && specKey === 'story' ? 'Mantenha elementos importantes centralizados (zona segura)' : ''}`
      );
    } else {
      promptParts.push(
        `Gerar imagem em dimensões ${finalWidth}x${finalHeight}px (aspect ratio ${ratioString})${dimensionSource === "customizadas" ? " - dimensões customizadas" : ""}.`
      );
    }
  } else {
    promptParts.push(
      `Gerar imagem em dimensões ${finalWidth}x${finalHeight}px (aspect ratio ${ratioString})${dimensionSource === "customizadas" ? " - dimensões customizadas" : ""}.`
    );
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

  try {
    const formData = await req.json();
    
    console.log("🎨 [GENERATE-IMAGE] Iniciando geração de imagem");
    
    // Input validation
    if (!formData || typeof formData !== 'object') {
      return new Response(
        JSON.stringify({ error: 'Invalid form data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Verificar se teamId foi enviado
    if (!formData.teamId) {
      console.error("❌ teamId não fornecido");
      return new Response(
        JSON.stringify({ error: 'Team ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!formData.description || typeof formData.description !== 'string' || formData.description.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Description is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (formData.description.length > 2000) {
      return new Response(
        JSON.stringify({ error: 'Description too long (max 2000 characters)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (formData.additionalInfo && typeof formData.additionalInfo === 'string' && formData.additionalInfo.length > 2000) {
      return new Response(
        JSON.stringify({ error: 'Additional info too long' }),
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

    // Inicializar Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      console.error("❌ Supabase não configurado");
      return new Response(
        JSON.stringify({ error: 'Database configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.39.3');
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verificar créditos do time ANTES de gerar
    const { data: teamData, error: teamError } = await supabase
      .from('teams')
      .select('credits_suggestions')
      .eq('id', formData.teamId)
      .single();

    if (teamError || !teamData) {
      console.error("❌ Erro ao buscar créditos:", teamError);
      return new Response(
        JSON.stringify({ error: 'Failed to check credits' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (teamData.credits_suggestions <= 0) {
      console.log("❌ Créditos insuficientes");
      return new Response(
        JSON.stringify({ error: 'Insufficient credits' }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`✅ Créditos disponíveis: ${teamData.credits_suggestions}`);

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
      
      console.log("✅ Imagem gerada com sucesso, decrementando crédito...");
      
      // Decrementar crédito após geração bem-sucedida
      const { error: updateError } = await supabase
        .from('teams')
        .update({ 
          credits_suggestions: teamData.credits_suggestions - 1 
        })
        .eq('id', formData.teamId);

      if (updateError) {
        console.error("⚠️ Erro ao decrementar crédito:", updateError);
        // Não falhar a requisição por isso, apenas logar
      } else {
        console.log(`✅ Crédito decrementado. Restam: ${teamData.credits_suggestions - 1}`);
      }
      
      return new Response(
        JSON.stringify({ 
          imageUrl: result.imageUrl,
          attempt: result.attempt,
          model: "google/gemini-2.5-flash-image-preview",
          creditsRemaining: teamData.credits_suggestions - 1
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
