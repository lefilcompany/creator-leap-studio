import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { CREDIT_COSTS } from '../_shared/creditCosts.ts';
import { checkUserCredits, deductUserCredits, recordUserCreditUsage } from '../_shared/userCredits.ts';
import { expandBriefing } from '../_shared/expandBriefing.ts';

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

// =====================================
// FONT STYLES & PLATFORM ASPECT RATIOS
// =====================================
const FONT_STYLES: Record<string, string> = {
  elegant: "serifa clássica, refinada, com elegância tipográfica",
  modern: "sans-serif limpa, geométrica, moderna e minimalista",
  fun: "script casual ou display arrojada, divertida e expressiva",
  impactful: "bold condensada, display forte, grande impacto visual",
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
  if (cameraAngle !== 'eye_level') advancedParts.push(`Câmera: ${cameraAngle}`);
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
  preserveImagesCount: number;
  styleReferenceImagesCount: number;
  headline: string;
  subtexto: string;
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
  if (params.platform) {
    const aspectRatio = PLATFORM_ASPECT_RATIO[params.platform];
    compParts.push(`Plataforma: ${params.platform}${aspectRatio ? ` (Aspect Ratio: ${aspectRatio})` : ''}`);
  }
  compParts.push(`Tipo: ${params.contentType === 'ads' ? 'ANÚNCIO PAGO — foco em conversão' : 'ORGÂNICO — foco em engajamento'}`);
  compParts.push(`Qualidade: 4K, profundidade de campo profissional`);
  sections.push(`### 3. COMPOSIÇÃO DA IMAGEM\n${compParts.join('\n')}`);

  // SECTION 4: TEXTO E DESIGN
  if (params.includeText && params.textContent) {
    const fontDesc = FONT_STYLES[params.fontStyle] || FONT_STYLES['modern'];
    sections.push(`### 4. TEXTO E DESIGN
- Headline: Renderize PERFEITAMENTE o texto: "${params.textContent}"
- Tipografia: ${fontDesc}
- Posição: ${params.textPosition || 'center'}. O texto NÃO deve obstruir o rosto.
- Legibilidade: O texto DEVE ser o foco principal e 100% legível. Utilize espaço negativo estratégico na imagem, sobreposições de gradiente sutil ou caixas de texto limpas para garantir contraste absoluto entre a fonte e o fundo. O texto não deve flutuar sem propósito, deve fazer parte de uma composição de design profissional em formato para ${params.platform || 'redes sociais'}.`);
  } else {
    sections.push(`### 4. SEM TEXTO\n- SEM TEXTO: CRÍTICO: NÃO inclua NENHUM texto, palavras, letras, números ou símbolos visíveis na imagem. A imagem deve ser puramente visual.`);
    // If refiner suggested headline/subtexto, note it for reference but don't render
    if (params.headline) {
      sections.push(`- Headline Sugerida (NÃO renderizar): "${params.headline}"\n- Subtexto/CTA Sugerido (NÃO renderizar): "${params.subtexto}"`);
    }
  }

  // SECTION 5: USO DE REFERÊNCIAS VISUAIS
  if (params.preserveImagesCount > 0 || params.styleReferenceImagesCount > 0) {
    const refParts: string[] = [];
    if (params.preserveImagesCount > 0) {
      refParts.push(`${params.preserveImagesCount} imagem(ns) da IDENTIDADE DA MARCA foram fornecidas. Use como REFERÊNCIA DE ESTILO: extraia a atmosfera, iluminação, paleta de cores e sentimento geral. A nova imagem DEVE parecer parte do mesmo conjunto visual.`);
    }
    if (params.styleReferenceImagesCount > 0) {
      refParts.push(`${params.styleReferenceImagesCount} imagem(ns) de REFERÊNCIA DO USUÁRIO foram fornecidas. Use como inspiração adicional de composição e estética.`);
    }
    sections.push(`### 5. USO DE REFERÊNCIAS VISUAIS\n${refParts.join('\n')}`);
  }

  // SECTION 6: ESPECIFICAÇÕES TÉCNICAS
  sections.push(`### 6. ESPECIFICAÇÕES TÉCNICAS E COMPLIANCE
- Formato: Otimizado para ${params.platform || 'redes sociais'}
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
    const [brandResult, themeResult, personaResult] = await Promise.all([
      formData.brandId ? supabase.from('brands').select('name, segment, values, keywords, goals, promise, restrictions, logo, moodboard, reference_image, brand_color, color_palette').eq('id', formData.brandId).single() : Promise.resolve({ data: null }),
      formData.themeId ? supabase.from('strategic_themes').select('title, description, tone_of_voice, target_audience, objectives, macro_themes, expected_action, best_formats, hashtags, color_palette, platforms').eq('id', formData.themeId).single() : Promise.resolve({ data: null }),
      formData.personaId ? supabase.from('personas').select('name, age, gender, location, professional_context, main_goal, challenges, beliefs_and_interests, interest_triggers, purchase_journey_stage, preferred_tone_of_voice').eq('id', formData.personaId).single() : Promise.resolve({ data: null }),
    ]);

    const brandData = brandResult.data;
    const themeData = themeResult.data;
    const personaData = personaResult.data;

    console.log('[Step 1] Data fetched:', { brand: !!brandData, theme: !!themeData, persona: !!personaData });

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
    const preserveImages: string[] = (formData.preserveImages || []).slice(0, 2);
    const styleReferenceImages: string[] = (formData.styleReferenceImages || []).slice(0, 1);

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
      preserveImagesCount: preserveImages.length,
      styleReferenceImagesCount: styleReferenceImages.length,
      headline: briefingResult.headline,
      subtexto: briefingResult.subtexto,
    });

    // Build image role prefix
    const hasAnyImages = preserveImages.length > 0 || styleReferenceImages.length > 0;
    let imageRolePrefix = '';
    if (hasAnyImages) {
      const parts: string[] = [];
      if (preserveImages.length > 0) parts.push(`A(s) primeira(s) ${preserveImages.length} imagem(ns) definem a Identidade Visual e Paleta de Cores obrigatória`);
      if (styleReferenceImages.length > 0) parts.push(`A(s) última(s) servem apenas como inspiração de composição`);
      imageRolePrefix = `${parts.join('. ')}.\n\n`;
    }

    // Build negative prompt
    const userNegativePrompt = cleanInput(formData.negativePrompt);
    const negativeComponents = [styleSettings.negativePrompt];
    if (userNegativePrompt) negativeComponents.push(userNegativePrompt);
    if (!includeText) negativeComponents.push('text, watermark, typography, letters, signature, words, labels');
    const finalNegativePrompt = negativeComponents.filter(Boolean).join(', ');

    // Final prompt
    const finalPrompt = `${imageRolePrefix}${masterPrompt}\n\n[AVOID] ${finalNegativePrompt}`;

    console.log('[Step 3] Final prompt length:', finalPrompt.length, 'chars');

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
    // STEP 5: Generate image via Gateway with retry
    // =====================================
    const MAX_RETRIES = 3;
    const REQUEST_TIMEOUT_MS = 45000;
    const PRIMARY_IMAGE_MODEL = 'gemini-2.5-flash-image';
    const FALLBACK_IMAGE_MODEL = 'gemini-2.5-flash-image';

    let lastError: any = null;
    let imageUrl: string | null = null;
    let resultDescription = 'Imagem gerada com sucesso';
    let usedImageModel = PRIMARY_IMAGE_MODEL;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const modelForAttempt = attempt === 1 ? PRIMARY_IMAGE_MODEL : FALLBACK_IMAGE_MODEL;
        usedImageModel = modelForAttempt;

        console.log(`[Step 5] Image generation attempt ${attempt}/${MAX_RETRIES} with model ${modelForAttempt}...`);

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
    // STEP 6: Upload to Storage
    // =====================================
    console.log('[Step 6] Uploading image to storage...');
    const timestamp = Date.now();
    const fileName = `content-images/${authenticatedTeamId || authenticatedUserId}/${timestamp}.png`;

    let binaryData: Uint8Array;
    if (imageUrl.startsWith('data:')) {
      const base64Data = imageUrl.split(',')[1];
      binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    } else {
      const imgResp = await fetch(imageUrl);
      binaryData = new Uint8Array(await imgResp.arrayBuffer());
    }

    const { error: uploadError } = await supabase.storage.from('content-images').upload(fileName, binaryData, { contentType: 'image/png', upsert: false });
    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return new Response(JSON.stringify({ error: 'Erro ao fazer upload da imagem' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: { publicUrl } } = supabase.storage.from('content-images').getPublicUrl(fileName);
    console.log('[Step 6] Image uploaded:', publicUrl);

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
      asset_path: fileName,
      thumb_path: fileName,
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
        pipeline: 'premium_v4',
      },
      result: {
        imageUrl: publicUrl,
        description: resultDescription,
        headline: briefingResult.headline || null,
        subtexto: briefingResult.subtexto || null,
        legenda: briefingResult.legenda || null,
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
      success: true
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error in generate-image function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
