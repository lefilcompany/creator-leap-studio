import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { CREDIT_COSTS } from '../_shared/creditCosts.ts';
import { checkUserCredits, deductUserCredits, recordUserCreditUsage } from '../_shared/userCredits.ts';
import { expandBriefing } from '../_shared/expandBriefing.ts';
import { postProcessImage, resolveAspectRatio, normalizeAspectRatioForGemini, ASPECT_RATIO_DIMENSIONS, decodeBase64Image } from '../_shared/imagePostProcess.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function cleanInput(text: string | string[] | undefined | null): string {
  if (!text) return "";
  if (Array.isArray(text)) return text.map(item => cleanInput(item)).join(", ");
  const textStr = String(text);
  return textStr.replace(/[<>{}[\]"'`]/g, "").replace(/\s+/g, " ").trim();
}

function normalizeImageArray(input: unknown, max = 5): string[] {
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
const FONT_STYLES: Record<string, string> = {
  elegant: "serifa clássica, refinada, com elegância tipográfica",
  modern: "sans-serif limpa, geométrica, moderna e minimalista",
  fun: "script casual ou display arrojada, divertida e expressiva",
  impactful: "bold condensada, display forte, grande impacto visual",
};

const TEXT_DESIGN_PROMPTS: Record<string, string> = {
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

const PLATFORM_ASPECT_RATIO: Record<string, string> = {
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

// ASPECT_RATIO_DIMENSIONS, normalizeAspectRatioForGemini, resolveAspectRatio
// are now imported from '../_shared/imagePostProcess.ts'


// =====================================
// STYLE SETTINGS
// =====================================
const getStyleSettings = (styleType: string) => {
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

const isPortraitRequest = (promptText: string): boolean => {
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
// BRIEFING DOCUMENT BUILDER (for text LLM only)
// =====================================
function buildBriefingDocument(formData: any, brandData: any, themeData: any, personaData: any): string {
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

  // Primary request
  sections.push(`PEDIDO PRINCIPAL DO USUÁRIO (PRIORIDADE MÁXIMA): ${description}`);

  // Brand context - COMPLETE data from DB
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

  // Theme context - COMPLETE data from DB
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

  // Persona context - COMPLETE data from DB
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

  // Platform
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

  // Advanced visual settings
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

  sections.push(`COMPLIANCE (incorporar silenciosamente na descrição visual):
- Respeitar diretrizes éticas brasileiras (CONAR/CDC)
- Sem discriminação, sem consumo de álcool visível
- Se público incluir menores, restrições máximas`);

  return sections.join('\n\n');
}

// =====================================
// BUILD DIRECTOR PROMPT (6 sections for image model)
// =====================================
function buildDirectorPrompt(params: {
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
  aspectRatio?: string;
  // Advanced visual settings
  colorPalette?: string;
  lighting?: string;
  composition?: string;
  cameraAngle?: string;
  detailLevel?: number;
  mood?: string;
  negativePrompt?: string;
  // Font details
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontItalic?: boolean;
}): string {
  const sections: string[] = [];

  // ROLE
  sections.push(`Atue como um Consultor de Marketing e Designer de Campanha de Alto Nível. O seu objetivo é criar uma peça visual impecável, esteticamente perfeita e com design inteligente, respeitando rigorosamente a identidade visual e os dados fornecidos abaixo.`);

  // SECTION 1: CONTEXTO DO UTILIZADOR E MARCA
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
  if (params.platform) {
    compParts.push(`Plataforma: ${params.platform}`);
  }
  compParts.push(`Tipo: ${params.contentType === 'ads' ? 'ANÚNCIO PAGO — foco em conversão' : 'ORGÂNICO — foco em engajamento'}`);
  compParts.push(`Qualidade: 4K, profundidade de campo profissional`);

  // Advanced visual settings — injected directly into the image prompt for maximum fidelity
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

  // SECTION 4: TEXTO E DESIGN
  const isAd = params.contentType === 'ads';
  const hasUserText = params.includeText && params.textContent;
  const hasRefinerText = params.headline || params.subtexto;
  
  // For ads: always include text (user-provided or refiner-generated)
  if (hasUserText || (isAd && hasRefinerText)) {
    const fontDesc = FONT_STYLES[params.fontStyle] || FONT_STYLES['modern'];
    
    // Determine which text to render
    const primaryText = params.textContent || params.headline || '';
    const ctaText = params.ctaText || (isAd ? params.subtexto : '') || '';
    
    const textParts = [`### 4. TEXTO E DESIGN
- IDIOMA OBRIGATÓRIO: Português Brasileiro (pt-BR). Todo texto DEVE seguir ortografia, acentuação e gramática do Português do Brasil. Use acentos corretamente (é, ã, ç, ô, etc.). NUNCA use português de Portugal ou espanhol.`];

    if (primaryText) {
      textParts.push(`- Headline: Renderize PERFEITAMENTE o texto EXATO: "${primaryText}"
  - CADA LETRA deve ser renderizada com precisão absoluta. Verifique caractere por caractere.
  - Acentos e cedilhas (á, é, í, ó, ú, â, ê, ô, ã, õ, ç) DEVEM estar corretos e visíveis.
  - NÃO altere, omita ou substitua nenhuma letra ou acento do texto fornecido.
  - NÃO invente texto adicional além do fornecido.`);
    }
    
    if (ctaText) {
      textParts.push(`- CTA (Call-to-Action): Renderize PERFEITAMENTE o texto EXATO: "${ctaText}"
  - O CTA deve estar posicionado de forma destacada, geralmente na parte inferior da imagem.
  - Use um botão ou destaque visual para o CTA (fundo contrastante, borda arredondada).
  - O CTA deve ser menor que a headline mas igualmente legível.`);
    }
    
    // Text design style
    const designPrompt = TEXT_DESIGN_PROMPTS[params.textDesignStyle] || TEXT_DESIGN_PROMPTS['clean'];
    // Build detailed typography instruction
    const fontFamilyDesc = params.fontFamily ? `Família tipográfica: "${params.fontFamily}"` : '';
    const fontWeightDesc = params.fontWeight ? `, peso ${params.fontWeight === '900' ? 'extra-bold/black' : params.fontWeight === '700' ? 'bold' : params.fontWeight === '600' ? 'semi-bold' : params.fontWeight === '400' ? 'regular' : params.fontWeight === '300' ? 'light' : `peso ${params.fontWeight}`}` : '';
    const fontItalicDesc = params.fontItalic ? ', estilo itálico' : '';
    const fontSizeDesc = params.fontSize ? `. Tamanho visual: ${params.fontSize <= 16 ? 'PEQUENO (discreto, texto de apoio)' : params.fontSize <= 24 ? 'MÉDIO (legível, destaque moderado)' : params.fontSize <= 32 ? 'GRANDE (destaque forte, hero text)' : 'EXTRA GRANDE (impacto máximo, display)'}` : '';
    
    const fullTypoDesc = `${fontDesc}${fontFamilyDesc ? `. ${fontFamilyDesc}${fontWeightDesc}${fontItalicDesc}` : ''}${fontSizeDesc}`;

    textParts.push(`- Tipografia: ${fullTypoDesc}
- Posição: ${params.textPosition || 'center'}. O texto NÃO deve obstruir o rosto.
- ${designPrompt}
- Legibilidade: O texto DEVE ser 100% legível. O design do texto deve fazer parte de uma composição profissional em formato para ${params.platform || 'redes sociais'}.
- VERIFICAÇÃO FINAL: Antes de finalizar, releia o texto renderizado e confirme que está IDÊNTICO ao texto fornecido, letra por letra, acento por acento.`);
    
    sections.push(textParts.join('\n'));
  } else if (params.includeText) {
    // includeText is true but no text available yet — still enforce text from context
    sections.push(`### 4. TEXTO E DESIGN
- IDIOMA OBRIGATÓRIO: Português Brasileiro (pt-BR).
- Crie uma headline curta (máx. 8 palavras) em português brasileiro relacionada ao objetivo do post.
- Se for anúncio, inclua também um CTA (Call-to-Action) curto e direto (ex: "Saiba mais", "Compre agora", "Garanta o seu").
- Tipografia: ${FONT_STYLES[params.fontStyle] || FONT_STYLES['modern']}
- Posição: ${params.textPosition || 'center'}.
- Legibilidade: 100% legível com contraste absoluto.`);
  } else {
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

  // SECTION 6: MODO ANÚNCIO PROFISSIONAL (condicional)
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

  // SECTION 7: ESPECIFICAÇÕES TÉCNICAS
  const dimInstruction = params.aspectRatio && ASPECT_RATIO_DIMENSIONS[params.aspectRatio]
    ? `\n- ⚠️ PROPORÇÃO OBRIGATÓRIA: ${params.aspectRatio} (${ASPECT_RATIO_DIMENSIONS[params.aspectRatio].width}x${ASPECT_RATIO_DIMENSIONS[params.aspectRatio].height}px). IGNORE proporções das imagens de referência.`
    : '';
  sections.push(`### ${params.adProfessionalMode ? '7' : '6'}. ESPECIFICAÇÕES TÉCNICAS E COMPLIANCE
- Formato: Otimizado para ${params.platform || 'redes sociais'}${dimInstruction}
- Resolução: 4K, PNG para nitidez
- COMPLIANCE ÉTICO (CONAR/CDC):
  - HONESTIDADE: A imagem NÃO pode induzir ao erro
  - DIGNIDADE: PROIBIDO discriminação ou discurso de ódio
  - ACESSIBILIDADE: Garantir contraste mínimo para textos`);

  return sections.join('\n\n');
}

// =====================================
// EXTRACT IMAGE FROM GEMINI DIRECT API RESPONSE
// =====================================
function extractImageFromResponse(data: any): { imageUrl: string | null; textResponse: string | null } {
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

// Convert OpenAI-style message content to Gemini parts format
function convertToGeminiParts(messageContent: any[]): any[] {
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Auth
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const authenticatedUserId = user.id;

    const { data: profile, error: profileError } = await supabase.from('profiles').select('team_id, credits').eq('id', authenticatedUserId).single();
    if (profileError) {
      return new Response(JSON.stringify({ error: 'Erro ao carregar perfil' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const authenticatedTeamId = profile?.team_id || null;

    const formData = await req.json();
    if (!formData.description || typeof formData.description !== 'string') {
      return new Response(JSON.stringify({ error: 'Descrição inválida' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    console.log('Generate Image Request:', {
      description: formData.description?.substring(0, 100),
      brandId: formData.brandId,
      platform: formData.platform,
      visualStyle: formData.visualStyle,
      userId: authenticatedUserId,
    });

    // Check credits
    const creditsCheck = await checkUserCredits(supabase, authenticatedUserId, CREDIT_COSTS.COMPLETE_IMAGE);
    if (!creditsCheck.hasCredits) {
      return new Response(JSON.stringify({ error: `Créditos insuficientes. Necessário: ${CREDIT_COSTS.COMPLETE_IMAGE} créditos` }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    const creditsBefore = creditsCheck.currentCredits;

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    // =====================================
    // STEP 1: Fetch COMPLETE data from DB in parallel
    // =====================================
    const [brandResult, themeResult, personaResult, stylePrefsResult] = await Promise.all([
      formData.brandId ? supabase.from('brands').select('name, segment, values, keywords, goals, promise, restrictions, logo, moodboard, reference_image, brand_color, color_palette').eq('id', formData.brandId).single() : Promise.resolve({ data: null }),
      formData.themeId ? supabase.from('strategic_themes').select('title, description, tone_of_voice, target_audience, objectives, macro_themes, expected_action, best_formats, hashtags, color_palette, platforms').eq('id', formData.themeId).single() : Promise.resolve({ data: null }),
      formData.personaId ? supabase.from('personas').select('name, age, gender, location, professional_context, main_goal, challenges, beliefs_and_interests, interest_triggers, purchase_journey_stage, preferred_tone_of_voice').eq('id', formData.personaId).single() : Promise.resolve({ data: null }),
      formData.brandId ? supabase.from('brand_style_preferences').select('positive_patterns, negative_patterns, style_summary, total_positive, total_negative').eq('brand_id', formData.brandId).maybeSingle() : Promise.resolve({ data: null }),
    ]);

    const brandData = brandResult.data;
    const themeData = themeResult.data;
    const personaData = personaResult.data;
    const stylePrefs = stylePrefsResult.data;

    console.log('[Step 1] Data fetched:', { brand: !!brandData, theme: !!themeData, persona: !!personaData, stylePrefs: !!stylePrefs });

    // =====================================
    // STEP 2: Build Briefing Document & Expand with LLM Refiner
    // =====================================
    const briefingDocument = buildBriefingDocument(formData, brandData, themeData, personaData);
    console.log('[Step 2] Briefing document:', briefingDocument.length, 'chars');

    const includeText = formData.includeText ?? false;
    const textContent = includeText ? cleanInput(formData.textContent) : undefined;
    const tones = Array.isArray(formData.tone) ? formData.tone : (formData.tone ? [formData.tone] : []);

    const briefingResult = await expandBriefing({
      briefingDocument,
      visualStyle: formData.visualStyle || 'realistic',
      hasTextOverlay: includeText,
      textContent: textContent || undefined,
      tones,
      brandData,
      themeData,
      personaData,
      platform: cleanInput(formData.platform),
    });

    console.log('[Step 2] Refiner result:', {
      hasVisual: !!briefingResult.expandedPrompt,
      headline: briefingResult.headline,
      subtexto: briefingResult.subtexto,
      legendaLength: briefingResult.legenda?.length || 0,
    });

    // =====================================
    // STEP 3: Build Master Prompt (buildDirectorPrompt)
    // =====================================
    const visualStyle = formData.visualStyle || 'realistic';
    const description = cleanInput(formData.description);
    const styleSettings = getStyleSettings(visualStyle);
    const isPortrait = visualStyle === 'realistic' && isPortraitRequest(description);

    let finalStyleSuffix = styleSettings.suffix;
    if (isPortrait) {
      finalStyleSuffix = "high-end portrait photography, hyper-realistic eyes with catchlight, detailed skin pores, masterpiece, 8k, shot on 85mm lens, f/1.4, cinematic lighting, sharp focus on eyes, natural skin tone, professional studio lighting, detailed iris";
    }

    const enrichedDescription = briefingResult.expandedPrompt || description;

    const brandReferenceImages = normalizeImageArray(formData.brandReferenceImages, 3);
    const userReferenceImages = normalizeImageArray(
      Array.isArray(formData.userReferenceImages) && formData.userReferenceImages.length > 0
        ? formData.userReferenceImages
        : formData.styleReferenceImages,
      5,
    );

    const preserveIndexSet = new Set<number>(
      Array.isArray(formData.preserveImageIndices)
        ? formData.preserveImageIndices
            .filter((idx: unknown): idx is number => Number.isInteger(idx) && Number(idx) >= 0 && Number(idx) < userReferenceImages.length)
        : []
    );

    const explicitUserPreserveImages = userReferenceImages.filter((_, idx) => preserveIndexSet.has(idx));
    const explicitUserStyleImages = userReferenceImages.filter((_, idx) => !preserveIndexSet.has(idx));

    const legacyPreserveImages = normalizeImageArray(formData.preserveImages, 5);
    const mergedPreservePool = [...new Set([...brandReferenceImages, ...legacyPreserveImages, ...explicitUserPreserveImages])];

    const maxReferenceImages = 5;
    const maxPreserveImages = 3;
    const preserveImages = mergedPreservePool.slice(0, maxPreserveImages);
    const remainingSlots = Math.max(0, maxReferenceImages - preserveImages.length);

    const mergedStylePool = [...new Set([...explicitUserStyleImages, ...normalizeImageArray(formData.styleReferenceImages, 5)])]
      .filter((img) => !preserveImages.includes(img));
    const styleReferenceImages = mergedStylePool.slice(0, remainingSlots);

    console.log('[Step 3] Reference images normalized:', {
      preserveImages: preserveImages.length,
      styleReferenceImages: styleReferenceImages.length,
      total: preserveImages.length + styleReferenceImages.length,
    });

    const masterPrompt = buildDirectorPrompt({
      originalDescription: description,
      enrichedDescription,
      brandData,
      themeData,
      personaData,
      platform: cleanInput(formData.platform),
      contentType: formData.contentType || 'organic',
      objective: cleanInput(formData.objective || formData.description),
      tones,
      visualStyle,
      styleSuffix: finalStyleSuffix,
      includeText,
      textContent: textContent || '',
      textPosition: cleanInput(formData.textPosition) || 'center',
      fontStyle: formData.fontStyle || 'modern',
      textDesignStyle: formData.textDesignStyle || 'clean',
      preserveImagesCount: preserveImages.length,
      styleReferenceImagesCount: styleReferenceImages.length,
      headline: briefingResult.headline,
      subtexto: briefingResult.subtexto,
      ctaText: cleanInput(formData.ctaText) || '',
      adProfessionalMode: formData.adMode === 'professional',
      priceText: cleanInput(formData.priceText) || '',
      includeBrandLogo: formData.includeBrandLogo || false,
      aspectRatio: formData.aspectRatio || undefined,
      // Advanced visual settings
      colorPalette: formData.colorPalette || 'auto',
      lighting: formData.lighting || 'natural',
      composition: formData.composition || 'auto',
      cameraAngle: formData.cameraAngle || 'eye_level',
      detailLevel: formData.detailLevel ?? 7,
      mood: formData.mood || 'auto',
      negativePrompt: cleanInput(formData.negativePrompt),
      // Font details
      fontSize: formData.fontSize,
      fontFamily: formData.fontFamily,
      fontWeight: formData.fontWeight,
      fontItalic: formData.fontItalic,
    });

    // Build image role prefix
    const hasAnyImages = preserveImages.length > 0 || styleReferenceImages.length > 0;
    let imageRolePrefix = '';
    if (hasAnyImages) {
      const parts: string[] = [
        '⚠️ INSTRUÇÃO CRÍTICA SOBRE IMAGENS ANEXADAS: As imagens fornecidas contêm o CONTEÚDO REAL (produto, pessoa, objeto) que DEVE aparecer na imagem gerada EXATAMENTE como é, sem NENHUMA alteração visual',
        'NUNCA redesenhe, reinterprete ou modifique o sujeito principal das imagens. Use-o TAL QUAL ELE É. Você pode remover o fundo e posicionar em novo cenário, mas o sujeito é INTOCÁVEL',
        '⚠️ PROPORÇÕES DAS REFERÊNCIAS: As imagens de referência servem APENAS para paleta, identidade visual, estilo e conteúdo. IGNORE COMPLETAMENTE as proporções e dimensões das imagens de referência. O formato de saída é definido EXCLUSIVAMENTE pelo aspect ratio solicitado',
      ];
      if (preserveImages.length > 0) parts.push(`As primeiras ${preserveImages.length} imagem(ns) marcadas como PRESERVAR são INTOCÁVEIS — reproduza com fidelidade PIXEL-PERFECT, sem alterar forma, cor, textura ou proporção`);
      if (styleReferenceImages.length > 0) parts.push(`As ${styleReferenceImages.length} imagem(ns) de referência também devem ter seu conteúdo integrado SEM ALTERAÇÃO na composição final`);
      imageRolePrefix = `${parts.join('. ')}.\n\n`;
    }

    // Build negative prompt
    const userNegativePrompt = cleanInput(formData.negativePrompt);
    const negativeComponents = [styleSettings.negativePrompt];
    if (userNegativePrompt) negativeComponents.push(userNegativePrompt);
    if (!includeText) negativeComponents.push('text, watermark, typography, letters, signature, words, labels');
    const finalNegativePrompt = negativeComponents.filter(Boolean).join(', ');

    // Resolve aspect ratio using shared utility
    const resolved = resolveAspectRatio({
      aspectRatio: formData.aspectRatio,
      width: formData.width,
      height: formData.height,
      platform: cleanInput(formData.platform),
    });
    const aspectRatio = resolved.aspectRatio;
    const aspectRatioSource = resolved.source;
    const geminiAspectRatio = normalizeAspectRatioForGemini(aspectRatio);
    const targetDims = ASPECT_RATIO_DIMENSIONS[aspectRatio] || ASPECT_RATIO_DIMENSIONS['1:1'];
    
    console.log('[Step 3] Aspect ratio resolution:', {
      rawAspectRatio: formData.aspectRatio || 'not set',
      resolvedAspectRatio: aspectRatio,
      normalizedForGemini: geminiAspectRatio || 'none',
      source: aspectRatioSource,
      targetWidth: targetDims.width,
      targetHeight: targetDims.height,
    });

    const dimensionPrefix = `⚠️ DIMENSÃO OBRIGATÓRIA: A imagem DEVE ser gerada com proporção EXATA de ${aspectRatio} (${targetDims.width}x${targetDims.height}px). IGNORE as proporções de qualquer imagem de referência. O OUTPUT deve ter EXATAMENTE esta proporção.\n\n`;
    const finalPrompt = `${dimensionPrefix}${imageRolePrefix}${masterPrompt}\n\n[AVOID] ${finalNegativePrompt}`;

    console.log('[Step 3] Final prompt length:', finalPrompt.length, 'chars');
    console.log('[Step 3] Aspect ratio:', aspectRatio, '-> Gemini:', geminiAspectRatio, '| source:', aspectRatioSource);

    // =====================================
    // STEP 4: Build message content with images
    // =====================================
    const messageContent: any[] = [{ type: 'text', text: finalPrompt }];

    for (const img of preserveImages) {
      if (img) messageContent.push({ type: 'image_url', image_url: { url: img } });
    }
    for (const img of styleReferenceImages) {
      if (img) messageContent.push({ type: 'image_url', image_url: { url: img } });
    }

    console.log(`[Step 4] Message parts: ${messageContent.length} (1 text + ${messageContent.length - 1} images)`);

    // =====================================
    // STEP 5: Generate image via Gemini Direct API (gemini-3-pro-image-preview)
    // =====================================
    const MAX_RETRIES = 3;
    const REQUEST_TIMEOUT_MS = 90000;
    const PRIMARY_IMAGE_MODEL = 'gemini-3-pro-image-preview';
    const FALLBACK_IMAGE_MODEL = 'gemini-2.5-flash-image';

    let lastError: any = null;
    let imageUrl: string | null = null;
    let resultDescription = 'Imagem gerada com sucesso';
    let usedImageModel = PRIMARY_IMAGE_MODEL;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const modelForAttempt = attempt <= 2 ? PRIMARY_IMAGE_MODEL : FALLBACK_IMAGE_MODEL;
        usedImageModel = modelForAttempt;

        console.log(`[Step 5] Image generation attempt ${attempt}/${MAX_RETRIES} with model ${modelForAttempt} via Gemini Direct API...`);

        const geminiParts = convertToGeminiParts(messageContent);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelForAttempt}:generateContent?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          body: JSON.stringify({
            contents: [{ role: 'user', parts: geminiParts }],
            generationConfig: {
              responseModalities: ['IMAGE', 'TEXT'],
              ...(geminiAspectRatio ? { imageConfig: { aspectRatio: geminiAspectRatio } } : {}),
            },
          }),
        }).finally(() => clearTimeout(timeoutId));

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Gemini error (attempt ${attempt}, model ${modelForAttempt}):`, response.status, errorText);

          if (response.status === 400) {
            return new Response(JSON.stringify({
              error: 'Requisição inválida para o modelo de imagem',
              model: modelForAttempt,
              details: errorText,
            }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }

          if (response.status === 429) {
            return new Response(JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente mais tarde.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
          if (response.status === 402) {
            return new Response(JSON.stringify({ error: 'Créditos de IA esgotados. Tente novamente mais tarde.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }

          lastError = new Error(`Gemini error (${modelForAttempt}): ${response.status}`);
          if (attempt < MAX_RETRIES) { await new Promise(r => setTimeout(r, 2000)); continue; }
          throw lastError;
        }

        const data = await response.json();
        const extracted = extractImageFromResponse(data);
        imageUrl = extracted.imageUrl;
        if (extracted.textResponse) resultDescription = extracted.textResponse;

        if (!imageUrl) {
          console.error(`[Step 5] No image in response (model ${modelForAttempt}).`);
          throw new Error(`No image found in response for model ${modelForAttempt}`);
        }

        console.log(`[Step 5] Image generated successfully on attempt ${attempt} with model ${modelForAttempt}`);
        break;

      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error);
        lastError = error;

        const isAbort = error instanceof Error && error.name === 'AbortError';
        if (isAbort) {
          console.error(`[Step 5] Timeout after ${REQUEST_TIMEOUT_MS}ms (attempt ${attempt}, model ${usedImageModel})`);
        }

        if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, 2000));
      }
    }

    if (!imageUrl) {
      return new Response(JSON.stringify({
        error: 'Falha ao gerar imagem após múltiplas tentativas',
        details: lastError instanceof Error ? lastError.message : String(lastError),
        model: usedImageModel,
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // =====================================
    // STEP 6: Post-process image (center-crop + resize)
    // =====================================
    console.log('[Step 6] Post-processing image to exact dimensions...');
    
    let binaryData: Uint8Array;
    if (imageUrl.startsWith('data:')) {
      binaryData = decodeBase64Image(imageUrl);
    } else {
      const imgResp = await fetch(imageUrl);
      binaryData = new Uint8Array(await imgResp.arrayBuffer());
    }

    const postProcessResult = await postProcessImage(
      binaryData,
      aspectRatio,
      targetDims.width,
      targetDims.height,
    );

    console.log('[Step 6] Post-process result:', {
      finalWidth: postProcessResult.finalWidth,
      finalHeight: postProcessResult.finalHeight,
      finalAspectRatio: postProcessResult.finalAspectRatio,
      wasCropped: postProcessResult.wasCropped,
      wasResized: postProcessResult.wasResized,
      outputSize: postProcessResult.processedData.length,
    });

    // =====================================
    // STEP 7: Upload to Storage
    // =====================================
    console.log('[Step 7] Uploading post-processed image to storage...');
    const timestamp = Date.now();
    const fileName = `content-images/${authenticatedTeamId || authenticatedUserId}/${timestamp}.png`;

    const { error: uploadError } = await supabase.storage.from('content-images').upload(fileName, postProcessResult.processedData, { contentType: 'image/png', upsert: false });
    
    let publicUrl: string;
    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      // Fallback: return base64 of post-processed image
      const base64Fallback = btoa(String.fromCharCode(...postProcessResult.processedData));
      publicUrl = `data:image/png;base64,${base64Fallback}`;
      console.warn('[Step 7] Upload failed, returning post-processed base64 fallback');
    } else {
      const { data: urlData } = supabase.storage.from('content-images').getPublicUrl(fileName);
      publicUrl = urlData.publicUrl;
      console.log('[Step 7] Image uploaded:', publicUrl);
    }

    // Deduct credits
    const deductResult = await deductUserCredits(supabase, authenticatedUserId, CREDIT_COSTS.COMPLETE_IMAGE);
    const creditsAfter = deductResult.newCredits;
    if (!deductResult.success) console.error('Error deducting credits:', deductResult.error);

    await recordUserCreditUsage(supabase, {
      userId: authenticatedUserId,
      teamId: authenticatedTeamId,
      actionType: 'COMPLETE_IMAGE',
      creditsUsed: CREDIT_COSTS.COMPLETE_IMAGE,
      creditsBefore,
      creditsAfter,
      description: 'Geração de imagem completa (Pipeline v4)',
      metadata: { platform: formData.platform, visualStyle, model: usedImageModel, hasHeadline: !!briefingResult.headline }
    });

    // Save to history
    const { data: actionData, error: actionError } = await supabase.from('actions').insert({
      type: 'CRIAR_CONTEUDO',
      user_id: authenticatedUserId,
      team_id: authenticatedTeamId,
      brand_id: formData.brandId || null,
      status: 'Aprovado',
      approved: true,
      asset_path: !uploadError ? fileName : null,
      thumb_path: !uploadError ? fileName : null,
      details: {
        description: formData.description,
        brandId: formData.brandId,
        themeId: formData.themeId,
        personaId: formData.personaId,
        platform: formData.platform,
        visualStyle,
        contentType: formData.contentType,
        preserveImagesCount: preserveImages.length,
        styleReferenceImagesCount: styleReferenceImages.length,
        pipeline: 'premium_v5',
        requestedAspectRatio: aspectRatio,
        aspectRatioSource,
      },
      result: {
        imageUrl: publicUrl,
        description: resultDescription,
        headline: briefingResult.headline || null,
        subtexto: briefingResult.subtexto || null,
        legenda: briefingResult.legenda || null,
        finalWidth: postProcessResult.finalWidth,
        finalHeight: postProcessResult.finalHeight,
        finalAspectRatio: postProcessResult.finalAspectRatio,
        requestedAspectRatio: postProcessResult.requestedAspectRatio,
        wasCropped: postProcessResult.wasCropped,
        wasResized: postProcessResult.wasResized,
      }
    }).select().single();

    if (actionError) console.error('Error creating action:', actionError);

    return new Response(JSON.stringify({
      imageUrl: publicUrl,
      description: resultDescription,
      headline: briefingResult.headline || null,
      subtexto: briefingResult.subtexto || null,
      legenda: briefingResult.legenda || null,
      actionId: actionData?.id,
      success: true,
      finalWidth: postProcessResult.finalWidth,
      finalHeight: postProcessResult.finalHeight,
      finalAspectRatio: postProcessResult.finalAspectRatio,
      requestedAspectRatio: postProcessResult.requestedAspectRatio,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error in generate-image function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
