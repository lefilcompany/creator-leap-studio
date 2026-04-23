/**
 * Shared image prompt building utilities.
 * Used by both generate-image and generate-quick-content edge functions.
 */

import { ASPECT_RATIO_DIMENSIONS } from './imagePostProcess.ts';

// =====================================
// UTILITY FUNCTIONS
// =====================================

/**
 * Safely converts a Uint8Array to a base64 string using chunked processing.
 * Avoids "Maximum call stack size exceeded" when using String.fromCharCode(...largeArray).
 */
export function uint8ArrayToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

export function cleanInput(text: string | string[] | undefined | null): string {
  if (!text) return "";
  if (Array.isArray(text)) return text.map(item => cleanInput(item)).join(", ");
  const textStr = String(text);
  return textStr.replace(/[<>{}[\]"'`]/g, "").replace(/\s+/g, " ").trim();
}

export function normalizeImageArray(input: unknown, max = 5): string[] {
  if (!Array.isArray(input)) return [];
  const normalized = input
    .filter((value): value is string => typeof value === 'string')
    .map(value => value.trim())
    .filter(value => /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(value));
  return [...new Set(normalized)].slice(0, max);
}

// =====================================
// FONT STYLES & PLATFORM ASPECT RATIOS
// =====================================

export const FONT_STYLES: Record<string, string> = {
  elegant: "serifa clássica, refinada, com elegância tipográfica",
  modern: "sans-serif limpa, geométrica, moderna e minimalista",
  fun: "script casual ou display arrojada, divertida e expressiva",
  impactful: "bold condensada, display forte, grande impacto visual",
};

export const TEXT_DESIGN_PROMPTS: Record<string, string> = {
  clean: `DESIGN CLEAN: O texto deve flutuar sobre espaço negativo natural da imagem. NÃO use overlays, barras ou caixas. Posicione o texto em áreas da imagem com cores sólidas ou desfocadas para garantir legibilidade natural. O fundo atrás do texto deve ser limpo e uniforme. Crie áreas de respiro visual estratégicas na composição para acomodar o texto.`,
  overlay: `DESIGN OVERLAY: Aplique uma faixa semitransparente (opacidade 40-60%) atrás do texto. A faixa deve cobrir toda a largura da imagem na posição do texto. Cor da faixa: preto com transparência OU cor primária da marca com transparência. O texto deve ser branco ou cor clara contrastante sobre a faixa. A faixa deve ter bordas suaves (sem bordas duras).`,
  gradient_bar: `DESIGN BARRA GRADIENTE: Crie uma barra horizontal com gradiente suave usando as cores da marca (ou gradiente escuro se não houver cores definidas). A barra deve ter altura suficiente para o texto + padding generoso. O gradiente deve fluir da esquerda para direita ou de cima para baixo. Texto branco ou claro sobre a barra. Bordas da barra com leve arredondamento (8-12px radius).`,
  cutout: `DESIGN RECORTE (KNOCKOUT): O texto deve ser RECORTADO/VAZADO, revelando a imagem de fundo através das letras. Use uma camada sólida (branca, preta ou cor da marca) com o texto recortado. O efeito de máscara deve mostrar a fotografia/imagem através da tipografia. As letras devem ser GRANDES e BOLD para o efeito funcionar. Use tipografia display grossa para máximo impacto visual.`,
  shadow_drop: `DESIGN SOMBRA PROJETADA: Aplique sombra forte e dramática no texto (drop shadow). Sombra preta com 60-80% opacidade, offset de 4-8px, blur de 12-20px. O texto pode ser branco, cor da marca ou cor clara. A sombra deve ser suficiente para garantir legibilidade sobre qualquer fundo. NÃO use overlays adicionais — apenas a sombra projetada no texto.`,
  neon_glow: `DESIGN NEON/GLOW: O texto deve ter efeito de brilho luminoso estilo neon. Aplique glow externo colorido (rosa, azul, verde ou cor da marca) ao redor de cada letra. O texto pode ser branco com glow colorido, ou colorido com glow matching. Intensidade do glow: forte e visível, como uma placa de neon real. O fundo ao redor do texto deve ser mais escuro para realçar o brilho. Adicione leve reflexo do neon nas superfícies próximas.`,
  boxed: `DESIGN EMOLDURADO: Coloque o texto dentro de uma caixa/moldura retangular. A caixa deve ter: fundo sólido (branco, preto ou cor da marca), borda visível (2-3px, cor contrastante), padding interno generoso (16-24px). O texto deve estar centralizado dentro da caixa. A caixa deve ter cantos arredondados (8-16px radius). A caixa deve parecer um elemento gráfico intencional do design, não um patch improvisado.`,
  badge: `DESIGN BADGE/SELO: O texto deve estar DENTRO de um selo, etiqueta ou badge colorido com formato dinâmico (circular, estrela, losango, fita, banner ou etiqueta de preço). Use cores vibrantes e contrastantes (vermelho, amarelo, laranja ou cor da marca). O badge deve ter: borda definida, sombra sutil para profundidade 3D, formato que remeta a promoção/destaque comercial. Ideal para preços, descontos e ofertas. O texto dentro deve ser BOLD e centralizado. Adicione elementos decorativos como raios, estrelas ou pontos de exclamação ao redor do badge.`,
  plaquinha: `DESIGN PLAQUINHA: O texto deve estar renderizado DENTRO de uma placa realista de madeira, metal, lousa ou acrílico. A placa deve ter: textura realista visível (grãos de madeira, reflexos metálicos ou textura de quadro negro), bordas definidas com profundidade/sombra, suportes ou parafusos decorativos nos cantos. O texto deve parecer gravado, pintado ou escrito a giz na placa. A placa deve estar posicionada na cena como um elemento fotográfico real, com perspectiva e iluminação coerentes com o ambiente.`,
  card_overlay: `DESIGN CARD OVERLAY: Crie um painel/card semitransparente ou sólido sobreposto à imagem, estilo material design ou glassmorphism. O card deve ter: fundo com blur (frosted glass) ou cor sólida com opacidade 80-90%, cantos arredondados (16-24px radius), sombra suave para elevar o card da imagem. Dentro do card, organize as informações em hierarquia clara: título em bold no topo, ícones pequenos ao lado de cada informação (📍 localização, 📞 telefone, 💰 preço), texto secundário menor. O card deve cobrir apenas parte da imagem (30-50%), mantendo o visual principal visível. Estilo profissional de anúncio imobiliário, gastronômico ou de serviços.`,
};

export const PLATFORM_ASPECT_RATIO: Record<string, string> = {
  'instagram_feed': '4:5',
  'instagram_stories': '9:16',
  'instagram_reels': '9:16',
  'facebook_post': '4:5',
  'linkedin_post': '1.91:1',
  'twitter': '1.91:1',
  'tiktok': '9:16',
  'youtube_thumbnail': '16:9',
  'pinterest': '2:3',
};

// =====================================
// STYLE SETTINGS
// =====================================

export const getStyleSettings = (styleType: string) => {
  const styles: Record<string, { suffix: string; negativePrompt: string }> = {
    realistic: {
      suffix: "high-end portrait photography, hyper-realistic, masterpiece, 8k, shot on 85mm lens, f/1.8, cinematic lighting, sharp focus, natural skin tone, professional studio lighting",
      negativePrompt: "deformed, asymmetrical face, plastic skin, doll-like, cartoon, anime, 3d render, lowres, bad anatomy, bad hands, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, jpeg artifacts, blurry, unnatural skin color"
    },
    animated: {
      suffix: "3D animated character in Pixar/Disney style, expressive features, smooth stylized rendering, vibrant colors, professional 3D animation quality, studio lighting, octane render",
      negativePrompt: "realistic photo, photograph, ugly, deformed, noisy, blurry, low contrast, realism, photorealistic, low quality"
    },
    cartoon: {
      suffix: "cartoon illustration style, bold outlines, flat colors, expressive character design, comic book style, vibrant and playful, clean vector-like illustration",
      negativePrompt: "realistic, photograph, 3d render, dark, scary, blurry, low quality, bad anatomy"
    },
    anime: {
      suffix: "anime art style, Japanese animation aesthetic, detailed eyes, clean lineart, vibrant cel-shading, manga-inspired, studio quality anime illustration",
      negativePrompt: "realistic, photograph, western cartoon, ugly, deformed, blurry, low quality, bad anatomy, extra limbs"
    },
    watercolor: {
      suffix: "watercolor painting style, soft washes of color, visible brush strokes, artistic texture, traditional watercolor on paper effect, delicate and flowing",
      negativePrompt: "digital art, photograph, sharp edges, flat colors, cartoon, anime, low quality"
    },
    oil_painting: {
      suffix: "oil painting style, rich textures, visible brushwork, classical art technique, masterful use of light and shadow, gallery-quality fine art",
      negativePrompt: "digital art, photograph, flat colors, cartoon, anime, low quality, blurry"
    },
    digital_art: {
      suffix: "professional digital art, polished illustration, concept art quality, detailed rendering, vibrant digital painting, artstation quality",
      negativePrompt: "photograph, blurry, low quality, bad anatomy, ugly, deformed"
    },
    sketch: {
      suffix: "pencil sketch style, hand-drawn lines, artistic crosshatching, graphite on paper texture, expressive sketching technique, traditional drawing",
      negativePrompt: "photograph, color, digital, painted, blurry, low quality"
    },
    minimalist: {
      suffix: "minimalist design, clean lines, simple shapes, limited color palette, elegant simplicity, modern aesthetic, white space emphasis",
      negativePrompt: "busy, cluttered, complex, realistic photo, detailed, ornate, low quality"
    },
    vintage: {
      suffix: "vintage retro aesthetic, nostalgic color grading, film grain texture, 70s/80s inspired style, warm tones, analog photography feel",
      negativePrompt: "modern, digital, clean, sharp, contemporary, low quality"
    }
  };
  return styles[styleType] || styles.realistic;
};

export const isPortraitRequest = (promptText: string): boolean => {
  const portraitKeywords = [
    'retrato', 'portrait', 'rosto', 'face', 'pessoa', 'person',
    'homem', 'man', 'mulher', 'woman', 'criança', 'child',
    'close-up', 'headshot', 'selfie', 'avatar', 'modelo', 'model',
    'executivo', 'executive', 'profissional', 'professional',
    'jovem', 'young', 'idoso', 'elderly', 'adulto', 'adult'
  ];
  return portraitKeywords.some(keyword => promptText.toLowerCase().includes(keyword));
};

// =====================================
// BRIEFING DOCUMENT BUILDER
// =====================================

export function buildBriefingDocument(formData: any, brandData: any, themeData: any, personaData: any, stylePrefs?: any): string {
  const sections: string[] = [];
  const description = cleanInput(formData.description);
  const platform = cleanInput(formData.platform);
  const objective = cleanInput(formData.objective);
  const tones = Array.isArray(formData.tone) ? formData.tone : (formData.tone ? [formData.tone] : []);
  const additionalInfo = cleanInput(formData.additionalInfo);
  const contentType = formData.contentType || 'organic';
  const visualStyle = formData.visualStyle || 'realistic';
  const negativePrompt = cleanInput(formData.negativePrompt);
  const colorPalette = formData.colorPalette || 'auto';
  const lighting = formData.lighting || 'natural';
  const composition = formData.composition || 'auto';
  const cameraAngle = formData.cameraAngle || 'eye_level';
  const detailLevel = formData.detailLevel || 7;
  const mood = formData.mood || 'auto';
  const preserveImages = formData.preserveImages || [];
  const styleReferenceImages = formData.styleReferenceImages || [];

  sections.push(`PEDIDO PRINCIPAL DO USUÁRIO (PRIORIDADE MÁXIMA): ${description}`);

  if (brandData) {
    let brandSection = `CONTEXTO DA MARCA: ${brandData.name} (${brandData.segment})`;
    if (brandData.values) brandSection += `\nValores: ${brandData.values}`;
    if (brandData.keywords) brandSection += `\nKeywords: ${brandData.keywords}`;
    if (brandData.goals) brandSection += `\nObjetivos: ${brandData.goals}`;
    if (brandData.promise) brandSection += `\nPromessa: ${brandData.promise}`;
    if (brandData.restrictions) brandSection += `\nRestrições: ${brandData.restrictions}`;
    if (brandData.brand_color) brandSection += `\nCor principal: ${brandData.brand_color}`;
    if (brandData.color_palette) {
      try {
        const colors = typeof brandData.color_palette === 'string' ? JSON.parse(brandData.color_palette) : brandData.color_palette;
        if (Array.isArray(colors) && colors.length > 0) {
          const hexColors = colors.map((c: any) => c.hex || c).filter(Boolean);
          brandSection += `\nPaleta de Cores: ${hexColors.join(', ')}`;
        }
      } catch {}
    }
    sections.push(brandSection);
  }

  if (themeData) {
    let themeSection = `TEMA ESTRATÉGICO: ${themeData.title}`;
    if (themeData.description) themeSection += `\nDescrição: ${themeData.description}`;
    if (themeData.tone_of_voice) themeSection += `\nTom de voz: ${themeData.tone_of_voice}`;
    if (themeData.target_audience) themeSection += `\nPúblico: ${themeData.target_audience}`;
    if (themeData.objectives) themeSection += `\nObjetivos: ${themeData.objectives}`;
    if (themeData.macro_themes) themeSection += `\nMacro-temas: ${themeData.macro_themes}`;
    if (themeData.expected_action) themeSection += `\nAção esperada: ${themeData.expected_action}`;
    if (themeData.best_formats) themeSection += `\nMelhores formatos: ${themeData.best_formats}`;
    if (themeData.hashtags) themeSection += `\nHashtags: ${themeData.hashtags}`;
    sections.push(themeSection);
  }

  if (personaData) {
    let personaSection = `PÚBLICO-ALVO (PERSONA): ${personaData.name} (${personaData.age}, ${personaData.gender})`;
    if (personaData.location) personaSection += `\nLocalização: ${personaData.location}`;
    if (personaData.professional_context) personaSection += `\nContexto profissional: ${personaData.professional_context}`;
    if (personaData.main_goal) personaSection += `\nObjetivo principal: ${personaData.main_goal}`;
    if (personaData.challenges) personaSection += `\nDesafios: ${personaData.challenges}`;
    if (personaData.beliefs_and_interests) personaSection += `\nCrenças e interesses: ${personaData.beliefs_and_interests}`;
    if (personaData.interest_triggers) personaSection += `\nGatilhos de interesse: ${personaData.interest_triggers}`;
    if (personaData.purchase_journey_stage) personaSection += `\nEstágio da jornada: ${personaData.purchase_journey_stage}`;
    if (personaData.preferred_tone_of_voice) personaSection += `\nTom preferido: ${personaData.preferred_tone_of_voice}`;
    sections.push(personaSection);
  }

  if (platform) {
    const platformMap: Record<string, string> = {
      'instagram_feed': 'Instagram Feed (formato quadrado, alto impacto visual)',
      'instagram_stories': 'Instagram Stories (vertical 9:16, dinâmico)',
      'instagram_reels': 'Instagram Reels (vertical 9:16, tendência)',
      'facebook_post': 'Facebook (compartilhável)',
      'linkedin_post': 'LinkedIn (profissional, corporativo)',
      'tiktok': 'TikTok (vertical, jovem, dinâmico)',
      'youtube_thumbnail': 'YouTube Thumbnail (16:9, chamar atenção)',
      'twitter': 'Twitter/X (horizontal, conciso)',
      'pinterest': 'Pinterest (vertical, estético)',
    };
    sections.push(`PLATAFORMA: ${platformMap[platform] || platform}`);
  }

  sections.push(`TIPO DE CONTEÚDO: ${contentType === 'ads' ? 'Publicidade paga (foco em conversão e CTA)' : 'Conteúdo orgânico (foco em engajamento e conexão)'}`);
  if (objective) sections.push(`OBJETIVO DO POST: ${objective}`);
  if (tones.length > 0) sections.push(`TOM DE VOZ: ${tones.join(', ')}`);

  const styleMap: Record<string, string> = {
    'realistic': 'Fotografia hiper-realista, cinematográfica',
    'animated': 'Animação 3D estilo Pixar/Disney',
    'cartoon': 'Ilustração cartoon com cores vibrantes',
    'anime': 'Arte anime/manga com estética japonesa',
    'watercolor': 'Pintura aquarela com texturas suaves',
    'oil_painting': 'Pintura a óleo clássica',
    'digital_art': 'Arte digital profissional, concept art',
    'sketch': 'Desenho a lápis, sketch artístico',
    'minimalist': 'Design minimalista, clean e elegante',
    'vintage': 'Estética vintage/retrô nostálgica',
  };
  sections.push(`ESTILO VISUAL: ${styleMap[visualStyle] || visualStyle}`);

  const advancedParts: string[] = [];
  if (colorPalette !== 'auto') advancedParts.push(`Paleta: ${colorPalette}`);
  if (lighting !== 'natural') advancedParts.push(`Iluminação: ${lighting}`);
  if (composition !== 'auto') advancedParts.push(`Composição: ${composition}`);
  const cameraAngleMap: Record<string, string> = {
    eye_level: 'Nível dos olhos: perspectiva natural, câmera na altura do sujeito',
    top_down: 'Vista superior (top-down/flat lay): câmera diretamente acima',
    low_angle: 'Contra-plongée: câmera de baixo para cima, transmite grandiosidade',
    high_angle: 'Plongée: câmera de cima para baixo',
    close_up: 'Close-up: enquadramento muito próximo, foco em detalhes',
    wide_shot: 'Plano geral (wide shot): enquadramento amplo com contexto',
    dutch_angle: 'Ângulo holandês (dutch angle): câmera inclinada, cria dinamismo',
    american_shot: 'Plano americano (cowboy shot): enquadramento dos joelhos/coxas para cima, equilibra expressão facial e ação corporal',
  };
  if (cameraAngle !== 'eye_level') advancedParts.push(`Câmera: ${cameraAngleMap[cameraAngle] || cameraAngle}`);
  if (mood !== 'auto') advancedParts.push(`Clima: ${mood}`);
  if (detailLevel !== 7) advancedParts.push(`Nível de detalhe: ${detailLevel}/10`);
  if (advancedParts.length > 0) sections.push(`CONFIGURAÇÕES VISUAIS AVANÇADAS:\n${advancedParts.join('\n')}`);

  if (preserveImages.length > 0) sections.push(`IMAGENS DE REFERÊNCIA DA MARCA: ${preserveImages.length} imagem(ns) da identidade visual foram fornecidas.`);
  if (styleReferenceImages.length > 0) sections.push(`IMAGENS DE REFERÊNCIA DE ESTILO: ${styleReferenceImages.length} imagem(ns) de referência de estilo foram fornecidas.`);
  if (additionalInfo) sections.push(`INFORMAÇÕES ADICIONAIS: ${additionalInfo}`);
  if (negativePrompt) sections.push(`ELEMENTOS A EVITAR: ${negativePrompt}`);

  if (stylePrefs && (stylePrefs.total_positive > 0 || stylePrefs.total_negative > 0)) {
    const prefParts: string[] = [`APRENDIZADO DE ESTILO (baseado em ${stylePrefs.total_positive + stylePrefs.total_negative} avaliações do usuário)`];
    if (stylePrefs.style_summary) prefParts.push(`Resumo: ${stylePrefs.style_summary}`);
    if (stylePrefs.total_positive > 0) prefParts.push(`${stylePrefs.total_positive} criações foram APROVADAS pelo usuário — siga esse estilo visual`);
    if (stylePrefs.total_negative > 0) prefParts.push(`${stylePrefs.total_negative} criações foram REJEITADAS pelo usuário — EVITE esse tipo de resultado visual`);
    sections.push(prefParts.join('. '));
  }

  sections.push(`COMPLIANCE (incorporar silenciosamente na descrição visual):
- Respeitar diretrizes éticas brasileiras (CONAR/CDC)
- Sem discriminação, sem consumo de álcool visível
- Se público incluir menores, restrições máximas`);

  return sections.join('\n\n');
}

// =====================================
// BUILD DIRECTOR PROMPT
// =====================================

export interface BuildDirectorPromptParams {
  originalDescription: string;
  enrichedDescription: string;
  brandData: any;
  themeData: any;
  personaData: any;
  platform: string;
  contentType: string;
  objective: string;
  tones: string[];
  visualStyle: string;
  styleSuffix: string;
  includeText: boolean;
  textContent: string;
  textPosition: string;
  fontStyle: string;
  textDesignStyle: string;
  preserveImagesCount: number;
  styleReferenceImagesCount: number;
  headline: string;
  subtexto: string;
  ctaText: string;
  adProfessionalMode: boolean;
  priceText: string;
  includeBrandLogo: boolean;
  disclaimerText?: string;
  disclaimerStyle?: string;
  aspectRatio?: string;
  colorPalette?: string;
  lighting?: string;
  composition?: string;
  cameraAngle?: string;
  detailLevel?: number;
  mood?: string;
  negativePrompt?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontItalic?: boolean;
}

export function buildDirectorPrompt(params: BuildDirectorPromptParams): string {
  const sections: string[] = [];

  sections.push(`Atue como um Consultor de Marketing e Designer de Campanha de Alto Nível. O seu objetivo é criar uma peça visual impecável, esteticamente perfeita e com design inteligente, respeitando rigorosamente a identidade visual e os dados fornecidos abaixo.`);

  // SECTION 1: CONTEXTO
  const contextParts: string[] = [];
  if (params.brandData) {
    contextParts.push(`Marca: ${params.brandData.name}`);
    if (params.brandData.segment) contextParts.push(`Setor: ${params.brandData.segment}`);
    if (params.brandData.values) contextParts.push(`Valores: ${params.brandData.values}`);
    if (params.brandData.promise) contextParts.push(`Promessa: ${params.brandData.promise}`);
    if (params.brandData.goals) contextParts.push(`Objetivos: ${params.brandData.goals}`);
    if (params.brandData.brand_color) contextParts.push(`Cor principal: ${params.brandData.brand_color}`);
    if (params.brandData.color_palette) {
      try {
        const colors = typeof params.brandData.color_palette === 'string' ? JSON.parse(params.brandData.color_palette) : params.brandData.color_palette;
        if (Array.isArray(colors) && colors.length > 0) {
          const hexColors = colors.map((c: any) => c.hex || c).filter(Boolean);
          contextParts.push(`Paleta de Cores Obrigatória: ${hexColors.join(', ')}. Se imagens de referência forem fornecidas, extraia a paleta exata delas.`);
        }
      } catch {}
    }
    if (params.brandData.restrictions) contextParts.push(`Restrições: ${params.brandData.restrictions}`);
  }
  if (params.personaData) {
    contextParts.push(`Público-Alvo: ${params.personaData.name} (${params.personaData.age}, ${params.personaData.gender}${params.personaData.location ? ', ' + params.personaData.location : ''})`);
    if (params.personaData.challenges) contextParts.push(`Desafios da Audiência: ${params.personaData.challenges}`);
    if (params.personaData.main_goal) contextParts.push(`Objetivo da Audiência: ${params.personaData.main_goal}`);
    if (params.personaData.interest_triggers) contextParts.push(`Gatilhos de Interesse: ${params.personaData.interest_triggers}`);
  }
  if (params.tones.length > 0) contextParts.push(`Tom de Voz: ${params.tones.join(', ')}`);
  if (contextParts.length > 0) sections.push(`### 1. CONTEXTO E MARCA\n${contextParts.join('\n')}`);

  // SECTION 2: DIRETRIZES ESTRATÉGICAS
  const stratParts: string[] = [];
  if (params.objective) stratParts.push(`Objetivo do Post: ${params.objective}`);
  if (params.personaData) stratParts.push(`Público-Alvo: ${params.personaData.name} — O design deve ressoar com este grupo.`);
  if (params.themeData) {
    stratParts.push(`Tema Estratégico: ${params.themeData.title}`);
    if (params.themeData.objectives) stratParts.push(`Objetivos da Pauta: ${params.themeData.objectives}`);
    if (params.themeData.macro_themes) stratParts.push(`Macro-temas: ${params.themeData.macro_themes}`);
    if (params.themeData.expected_action) stratParts.push(`Ação Esperada: ${params.themeData.expected_action}`);
  }
  if (stratParts.length > 0) sections.push(`### 2. DIRETRIZES ESTRATÉGICAS\n${stratParts.join('\n')}`);

  // SECTION 3: COMPOSIÇÃO DA IMAGEM
  const compParts: string[] = [];
  compParts.push(`INSTRUÇÃO PRINCIPAL DO USUÁRIO: ${params.originalDescription}`);
  compParts.push(`Cena Expandida: ${params.enrichedDescription}`);
  compParts.push(`Estilo Visual: ${params.styleSuffix}`);
  if (params.aspectRatio) {
    const dims = ASPECT_RATIO_DIMENSIONS[params.aspectRatio];
    if (dims) {
      compParts.push(`⚠️ DIMENSÃO OBRIGATÓRIA: A imagem DEVE ser gerada com proporção EXATA de ${params.aspectRatio} (${dims.width}x${dims.height}px). IGNORE as proporções de qualquer imagem de referência. O OUTPUT deve ter EXATAMENTE esta proporção.`);
    }
  }
  if (params.platform) compParts.push(`Plataforma: ${params.platform}`);
  compParts.push(`Tipo: ${params.contentType === 'ads' ? 'ANÚNCIO PAGO — foco em conversão' : 'ORGÂNICO — foco em engajamento'}`);
  compParts.push(`Qualidade: 4K, profundidade de campo profissional`);

  // Advanced visual settings maps
  const colorPaletteMap: Record<string, string> = {
    warm: 'Paleta quente: tons de vermelho, laranja, amarelo, dourado',
    cool: 'Paleta fria: tons de azul, ciano, turquesa, violeta',
    pastel: 'Paleta pastel: cores suaves, dessaturadas, tom delicado',
    vibrant: 'Paleta vibrante: cores saturadas, alto contraste, energia visual',
    monochrome: 'Paleta monocromática: variações de uma única cor, elegante e coesa',
    earth: 'Paleta terrosa: marrom, bege, verde oliva, tons naturais orgânicos',
    neon: 'Paleta neon: cores fluorescentes intensas, brilhantes e impactantes',
    dark: 'Paleta escura (dark mode): tons profundos, preto, cinza escuro, acentos sutis',
  };
  const lightingMap: Record<string, string> = {
    natural: 'Iluminação natural: luz do sol ou ambiente, sombras suaves e realistas',
    studio: 'Iluminação de estúdio: flash profissional, controle total de luz e sombra',
    dramatic: 'Iluminação dramática: alto contraste, sombras profundas, estilo chiaroscuro',
    soft: 'Iluminação suave (soft light): difusa, sem sombras duras, tom etéreo',
    golden_hour: 'Golden hour: luz dourada quente, sombras longas, tom romântico',
    backlit: 'Contraluz (backlit): silhueta ou halo de luz, efeito cinematográfico',
    neon: 'Iluminação neon: luzes coloridas artificiais, estilo cyberpunk/urbano',
    flat: 'Iluminação plana: uniforme, sem sombras marcantes, ideal para produtos',
  };
  const compositionMap: Record<string, string> = {
    rule_of_thirds: 'Composição em regra dos terços: sujeito nos pontos de intersecção',
    centered: 'Composição centralizada: sujeito no centro da imagem, simetria',
    symmetry: 'Composição simétrica: equilíbrio visual perfeito entre os lados',
    diagonal: 'Composição diagonal: linhas diagonais criam dinamismo e movimento',
    framing: 'Enquadramento natural (framing): elementos da cena emolduram o sujeito',
    negative_space: 'Espaço negativo: grandes áreas vazias, minimalismo e respiro visual',
    golden_ratio: 'Proporção áurea: composição baseada na espiral de Fibonacci',
    fill_frame: 'Preencher quadro: sujeito ocupa toda a imagem, impacto máximo',
  };
  const cameraAngleMap: Record<string, string> = {
    eye_level: 'Nível dos olhos: perspectiva natural, câmera na altura do sujeito',
    top_down: 'Vista superior (top-down/flat lay): câmera diretamente acima',
    low_angle: 'Contra-plongée: câmera de baixo para cima, transmite grandiosidade',
    high_angle: 'Plongée: câmera de cima para baixo',
    close_up: 'Close-up: enquadramento muito próximo, foco em detalhes',
    wide_shot: 'Plano geral (wide shot): enquadramento amplo com contexto',
    dutch_angle: 'Ângulo holandês (dutch angle): câmera inclinada, cria dinamismo',
    american_shot: 'Plano americano (cowboy shot): enquadramento dos joelhos/coxas para cima, equilibra expressão facial e ação corporal',
  };
  const moodMap: Record<string, string> = {
    professional: 'Clima profissional: corporativo, confiável, sério',
    playful: 'Clima divertido e descontraído: leve, alegre, acessível',
    luxurious: 'Clima luxuoso: sofisticado, premium, exclusivo',
    energetic: 'Clima energético: dinâmico, motivacional, vibrante',
    calm: 'Clima calmo e sereno: zen, relaxante, pacífico',
    mysterious: 'Clima misterioso: intrigante, sombrio, atmosférico',
    romantic: 'Clima romântico: suave, acolhedor, intimista',
    urban: 'Clima urbano: moderno, streetwear, cosmopolita',
  };

  if (params.colorPalette && params.colorPalette !== 'auto') {
    compParts.push(`🎨 PALETA DE CORES: ${colorPaletteMap[params.colorPalette] || params.colorPalette}. Aplique esta paleta de forma dominante em toda a imagem.`);
  }
  if (params.lighting && params.lighting !== 'natural') {
    compParts.push(`💡 ILUMINAÇÃO: ${lightingMap[params.lighting] || params.lighting}. Aplique este esquema de iluminação como diretriz principal.`);
  }
  if (params.composition && params.composition !== 'auto') {
    compParts.push(`📐 COMPOSIÇÃO: ${compositionMap[params.composition] || params.composition}. Siga esta regra de composição rigorosamente.`);
  }
  if (params.cameraAngle && params.cameraAngle !== 'eye_level') {
    compParts.push(`📷 ÂNGULO DE CÂMERA: ${cameraAngleMap[params.cameraAngle] || params.cameraAngle}. Posicione a câmera virtual EXATAMENTE neste ângulo.`);
  }
  if (params.mood && params.mood !== 'auto') {
    compParts.push(`🎭 CLIMA/ATMOSFERA: ${moodMap[params.mood] || params.mood}. A imagem inteira deve transmitir esta atmosfera.`);
  }
  if (params.detailLevel !== undefined && params.detailLevel !== 7) {
    const detailDesc = params.detailLevel <= 3 ? 'Baixo detalhe: formas simplificadas, estilo clean e abstrato' :
                       params.detailLevel <= 5 ? 'Detalhe moderado: equilíbrio entre simplicidade e realismo' :
                       params.detailLevel >= 9 ? 'Ultra-detalhado: texturas microscópicas, hiper-realismo extremo, cada elemento meticulosamente renderizado' :
                       `Nível de detalhe: ${params.detailLevel}/10`;
    compParts.push(`🔍 DETALHAMENTO: ${detailDesc}`);
  }
  if (params.negativePrompt) {
    compParts.push(`🚫 EVITAR ABSOLUTAMENTE: ${params.negativePrompt}`);
  }

  sections.push(`### 3. COMPOSIÇÃO DA IMAGEM\n${compParts.join('\n')}`);

  // SECTION 4: RESERVA PARA OVERLAY DE TEXTO
  const hasAnyOverlayText = params.includeText && Boolean(
    params.textContent || params.ctaText || params.disclaimerText || params.headline || params.subtexto
  );

  if (hasAnyOverlayText) {
    const designPrompt = TEXT_DESIGN_PROMPTS[params.textDesignStyle] || TEXT_DESIGN_PROMPTS['clean'];
    const reservedTexts = [params.textContent, params.ctaText, params.disclaimerText]
      .filter((value): value is string => Boolean(value && value.trim()))
      .map((value) => `"${value.trim()}"`)
      .join(', ');

    sections.push(`### 4. RESERVA PARA OVERLAY DE TEXTO
- NÃO renderize, escreva, desenhe, insira ou gere qualquer tipografia, letras, palavras, números, logotipos tipográficos, CTA ou aviso legal dentro da imagem base.
- A imagem final DEVE vir sem texto embutido. Todo o texto será aplicado depois, em pós-processamento.
- Crie composição com espaço negativo limpo e contraste suficiente para receber overlay posterior.
- Área preferencial do espaço livre: ${params.textPosition || 'center'}.
- O espaço reservado deve acomodar estes textos sem sobreposição com o sujeito principal: ${reservedTexts || 'texto configurado externamente'}.
- ${designPrompt}
- Evite elementos visuais de alto contraste, ruído, detalhes críticos ou objetos importantes na região reservada para o texto.`);
  }
    sections.push(`### 4. SEM TEXTO\n- SEM TEXTO: CRÍTICO: NÃO inclua NENHUM texto, palavras, letras, números ou símbolos visíveis na imagem. A imagem deve ser puramente visual.`);
  }

  // SECTION 5: USO DE REFERÊNCIAS VISUAIS
  if (params.preserveImagesCount > 0 || params.styleReferenceImagesCount > 0) {
    const refParts: string[] = [
      'REGRA CRÍTICA ABSOLUTA: As imagens de referência anexadas são o CONTEÚDO REAL e PRINCIPAL da imagem a ser gerada. NÃO são inspiração — são o SUJEITO.',
      '',
      '⚠️ PROIBIÇÃO ABSOLUTA: NUNCA altere, modifique, redesenhe, reinterprete ou recrie os elementos principais das imagens de referência.',
      '- O produto/objeto/pessoa da referência DEVE aparecer EXATAMENTE como é na foto original.',
      '- Mantenha TODAS as características visuais originais: forma, cor, textura, proporção, detalhes, perspectiva.',
      '- NÃO mude o design do produto. NÃO mude as cores do produto. NÃO mude o formato do produto.',
      '- NÃO gere uma versão "artística" ou "estilizada" do produto — use-o TAL QUAL ELE É.',
      '',
      'O QUE VOCÊ PODE FAZER:',
      '- Remover o fundo original e posicionar o elemento em um novo cenário/composição.',
      '- Ajustar iluminação e sombras para integrar o elemento ao novo cenário.',
      '- Adicionar elementos complementares ao redor (cenário, props, decoração).',
      '- Aplicar o estilo visual (fotorealístico, etc.) APENAS ao cenário/fundo, NUNCA ao produto/sujeito principal.',
      '',
      'RESULTADO ESPERADO: A imagem final deve parecer uma FOTO PROFISSIONAL onde o produto/sujeito REAL foi fotografado em um novo cenário, como em um estúdio de fotografia profissional.'
    ];

    if (params.preserveImagesCount > 0) {
      refParts.push(`\n${params.preserveImagesCount} imagem(ns) marcadas como PRESERVAR: Esses elementos são INTOCÁVEIS. Reproduza-os com fidelidade PIXEL-PERFECT. NÃO altere NADA do sujeito principal — forma, cor, proporção, textura, detalhes devem ser idênticos ao original. A imagem final DEVE conter esses elementos como sujeito principal.`);
    }
    if (params.styleReferenceImagesCount > 0) {
      refParts.push(`${params.styleReferenceImagesCount} imagem(ns) de REFERÊNCIA: O conteúdo dessas imagens (produto, pessoa, ambiente) DEVE ser integrado na composição EXATAMENTE como aparece na referência. NÃO redesenhe ou reinterprete — use o elemento REAL.`);
    }

    sections.push(`### 5. USO DE REFERÊNCIAS VISUAIS\n${refParts.join('\n')}`);
  }

  // SECTION 6: MODO ANÚNCIO PROFISSIONAL
  if (params.adProfessionalMode) {
    const brandColor = params.brandData?.brand_color || 'cor vibrante';
    const priceSection = params.priceText ? `\n2. PREÇO/OFERTA: "${params.priceText}" em destaque absoluto com badge/selo colorido contrastante (vermelho, amarelo ou laranja). O preço deve estar em um badge/etiqueta com formato dinâmico (estrela, fita, selo circular) e ser o segundo elemento mais visível da peça.` : '';
    const ctaSection = params.ctaText ? `\n3. CTA: "${params.ctaText}" em botão arredondado com cor contrastante, posicionado na parte inferior. Deve parecer um botão clicável com sombra sutil.` : '';
    const logoSection = params.includeBrandLogo ? `\n- LOGO DA MARCA: Posicione o logo da marca (se disponível nas referências) no canto superior direito ou inferior esquerdo, com tamanho discreto mas visível.` : '';

    sections.push(`### 6. MODO ANÚNCIO PROFISSIONAL
Esta imagem DEVE parecer uma PEÇA PUBLICITÁRIA PROFISSIONAL de design gráfico brasileiro. Siga RIGOROSAMENTE estes padrões:

LAYOUT:
- Fundo de cor sólida vibrante (usar ${brandColor} ou cor complementar forte e impactante)
- Elementos decorativos 3D ao redor do sujeito principal (raios de luz, formas geométricas, megafones estilizados, setas dinâmicas, splashes de cor)
- Produto/sujeito principal em destaque absoluto no centro ou terço áureo da composição
- Composição assimétrica e dinâmica, com energia visual alta${logoSection}

HIERARQUIA DE TEXTO (ordem de importância visual):
1. HEADLINE: Texto principal em tipografia BOLD GIGANTE (hero text), ocupando 30-40% da área visual. Deve ser o elemento mais chamativo da peça.${priceSection}${ctaSection}
4. DETALHES: Informações secundárias em texto menor e discreto

DESIGN GRÁFICO OBRIGATÓRIO:
- Use badges/selos coloridos para destacar preços e ofertas (estilo promoção brasileira)
- Cards sobrepostos com informações quando apropriado (estilo material design)
- Elementos 3D decorativos para dinamismo e energia visual
- Contraste FORTE entre texto e fundo (legibilidade é prioridade máxima)
- Visual IMPACTANTE, chamativo, vibrante — estilo design gráfico profissional brasileiro de agência
- Referência visual: peças de social media de grandes marcas brasileiras (McDonald's, iFood, Magazine Luiza)`);
  }

  // DISCLAIMER / SAFETY TEXT
  if (params.disclaimerText?.trim()) {
    const disclaimerPositionMap: Record<string, string> = {
      'bottom_horizontal': 'na parte inferior da imagem, centralizado, em uma linha horizontal fina',
      'bottom_left_vertical': 'no canto inferior esquerdo, texto rotacionado 90° (deitado na vertical, lido de baixo para cima)',
      'bottom_right_vertical': 'no canto inferior direito, texto rotacionado 90° (deitado na vertical, lido de baixo para cima)',
      'bottom_band': 'em uma faixa escura semitransparente na parte inferior da imagem, texto centralizado',
    };
    const posDesc = disclaimerPositionMap[params.disclaimerStyle || 'bottom_horizontal'] || disclaimerPositionMap['bottom_horizontal'];
    const sectionNum = params.adProfessionalMode ? '7' : '6';
    sections.push(`### ${sectionNum}. TEXTO DE SEGURANÇA / AVISO LEGAL
- OBRIGATÓRIO: Renderize o seguinte aviso EXATAMENTE como fornecido: "${params.disclaimerText.trim()}"
- Posição: ${posDesc}
- Fonte: MUITO PEQUENA (6-8px visual), discreta, em caixa alta
- Cor: branco ou cinza claro com opacidade reduzida (60-80%), garantindo legibilidade mínima
- NÃO deve competir visualmente com o conteúdo principal
- Este texto é um requisito legal/regulatório e DEVE estar presente na imagem final`);
  }

  // ESPECIFICAÇÕES TÉCNICAS
  const techSectionNum = params.disclaimerText?.trim()
    ? (params.adProfessionalMode ? '8' : '7')
    : (params.adProfessionalMode ? '7' : '6');
  const dimInstruction = params.aspectRatio && ASPECT_RATIO_DIMENSIONS[params.aspectRatio]
    ? `\n- ⚠️ PROPORÇÃO OBRIGATÓRIA: ${params.aspectRatio} (${ASPECT_RATIO_DIMENSIONS[params.aspectRatio].width}x${ASPECT_RATIO_DIMENSIONS[params.aspectRatio].height}px). IGNORE proporções das imagens de referência.`
    : '';
  sections.push(`### ${techSectionNum}. ESPECIFICAÇÕES TÉCNICAS E COMPLIANCE
- Formato: Otimizado para ${params.platform || 'redes sociais'}${dimInstruction}
- Resolução: 4K, PNG para nitidez
- COMPLIANCE ÉTICO (CONAR/CDC):
  - HONESTIDADE: A imagem NÃO pode induzir ao erro
  - DIGNIDADE: PROIBIDO discriminação ou discurso de ódio
  - ACESSIBILIDADE: Garantir contraste mínimo para textos`);

  return sections.join('\n\n');
}

// =====================================
// EXTRACT IMAGE FROM GEMINI RESPONSE
// =====================================

export function extractImageFromResponse(data: any): { imageUrl: string | null; textResponse: string | null } {
  let imageUrl: string | null = null;
  let textResponse: string | null = null;

  const parts = data.candidates?.[0]?.content?.parts;
  if (parts) {
    for (const part of parts) {
      if (part.inlineData?.data && !imageUrl) {
        imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
      }
      if (part.text && !textResponse) {
        textResponse = part.text;
      }
    }
  }
  return { imageUrl, textResponse };
}

// =====================================
// CONVERT TO GEMINI PARTS
// =====================================

export function convertToGeminiParts(messageContent: any[]): any[] {
  const parts: any[] = [];
  for (const item of messageContent) {
    if (item.type === 'text') {
      parts.push({ text: item.text });
    } else if (item.type === 'image_url' && item.image_url?.url) {
      const url = item.image_url.url;
      if (url.startsWith('data:')) {
        const match = url.match(/^data:([^;]+);base64,(.+)$/);
        if (match) {
          parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
        }
      }
    }
  }
  return parts;
}

// =====================================
// FETCH APPROVED FEEDBACK IMAGES
// =====================================

export async function fetchApprovedFeedbackImages(
  supabaseUrl: string,
  approvedFeedbackImages: any[],
  logPrefix = '[Shared]'
): Promise<string[]> {
  const feedbackBase64Images: string[] = [];
  if (approvedFeedbackImages.length === 0) return feedbackBase64Images;

  const supabaseStorageUrl = `${supabaseUrl}/storage/v1/object/public/content-images/`;
  for (const fb of approvedFeedbackImages) {
    try {
      let imgUrl = fb.image_url || '';
      if (imgUrl && !imgUrl.startsWith('data:') && !imgUrl.startsWith('http')) {
        imgUrl = `${supabaseStorageUrl}${imgUrl.replace(/^\/+/, '')}`;
      }
      if (!imgUrl || imgUrl.startsWith('data:')) continue;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const imgResp = await fetch(imgUrl, { signal: controller.signal }).finally(() => clearTimeout(timeoutId));
      if (!imgResp.ok) continue;

      const buffer = new Uint8Array(await imgResp.arrayBuffer());
      if (buffer.length < 100) continue;
      const b64 = uint8ArrayToBase64(buffer);
      const mimeType = imgResp.headers.get('content-type') || 'image/png';
      feedbackBase64Images.push(`data:${mimeType};base64,${b64}`);
    } catch (e) {
      console.warn(`${logPrefix} Failed to fetch approved feedback image, skipping:`, e);
    }
  }
  console.log(`${logPrefix} Fetched ${feedbackBase64Images.length}/${approvedFeedbackImages.length} approved feedback images as base64`);
  return feedbackBase64Images;
}

// =====================================
// BUILD FEEDBACK INSTRUCTION + MESSAGE CONTENT
// =====================================

export function buildFeedbackMessageParts(
  approvedFeedbackImages: any[],
  feedbackBase64Images: string[],
  feedbackSlots: number,
): { feedbackInstruction: string; feedbackImagesToAdd: string[] } {
  const feedbackToAdd = feedbackBase64Images.slice(0, feedbackSlots);

  const approvedRecipes: string[] = [];
  for (const fb of approvedFeedbackImages) {
    const actionDetails = (fb as any).actions?.details;
    if (actionDetails && typeof actionDetails === 'object') {
      const recipe: string[] = [];
      if (actionDetails.prompt || actionDetails.description) recipe.push(`Prompt: "${(actionDetails.prompt || actionDetails.description || '').substring(0, 200)}"`);
      if (actionDetails.visualStyle) recipe.push(`Estilo: ${actionDetails.visualStyle}`);
      if (actionDetails.colorPalette && actionDetails.colorPalette !== 'auto') recipe.push(`Paleta: ${actionDetails.colorPalette}`);
      if (actionDetails.lighting && actionDetails.lighting !== 'natural') recipe.push(`Iluminação: ${actionDetails.lighting}`);
      if (actionDetails.composition && actionDetails.composition !== 'auto') recipe.push(`Composição: ${actionDetails.composition}`);
      if (actionDetails.cameraAngle && actionDetails.cameraAngle !== 'eye_level') recipe.push(`Ângulo: ${actionDetails.cameraAngle}`);
      if (actionDetails.mood && actionDetails.mood !== 'auto') recipe.push(`Clima: ${actionDetails.mood}`);
      if (actionDetails.platform) recipe.push(`Plataforma: ${actionDetails.platform}`);
      if (actionDetails.style) recipe.push(`Style: ${actionDetails.style}`);
      if (recipe.length > 0) approvedRecipes.push(`- ${recipe.join(' | ')}`);
    }
  }

  let feedbackInstruction = `\n\nREFERÊNCIAS DE ESTILO APROVADO: As criações a seguir foram APROVADAS pelo usuário como exemplos do estilo visual desejado para esta marca.`;
  if (approvedRecipes.length > 0) {
    feedbackInstruction += `\n\nCONFIGURAÇÕES QUE GERARAM RESULTADOS APROVADOS (use como guia de estilo):\n${approvedRecipes.join('\n')}`;
    feedbackInstruction += `\n\nSiga padrões semelhantes de estilo visual, paleta, iluminação e composição quando compatíveis com o pedido atual.`;
  }
  if (feedbackToAdd.length > 0) {
    feedbackInstruction += `\n\nAs ${feedbackToAdd.length} imagem(ns) a seguir são exemplos visuais aprovados. Use-as como referência forte para cores, composição, atmosfera e estilo geral.`;
  }

  return { feedbackInstruction, feedbackImagesToAdd: feedbackToAdd };
}
