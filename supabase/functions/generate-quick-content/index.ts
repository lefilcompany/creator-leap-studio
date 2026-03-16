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

function cleanInput(text: string | undefined | null): string {
  if (!text) return '';
  return text.replace(/[<>{}\[\]"`]/g, '').replace(/\s+/g, ' ').trim();
}

// =====================================
// STYLE SETTINGS
// =====================================
const getStyleSettings = (styleType: string) => {
  const styles: Record<string, { suffix: string; negativePrompt: string }> = {
    realistic: {
      suffix: "high-end portrait photography, hyper-realistic eyes with catchlight, detailed skin pores, fine facial hair, masterpiece, 8k, shot on 85mm lens, f/1.8, cinematic lighting, sharp focus on eyes, natural skin tone, professional studio lighting, raw photo",
      negativePrompt: "cartoon, anime, 3d render, illustration, painting, drawing, deformed eyes, asymmetrical face, plastic skin, doll-like, lowres, fused eyes, extra eyelashes, bad anatomy, elongated face, bad hands, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, jpeg artifacts, signature, watermark, blurry, crossed eyes, lazy eye, unnatural skin color"
    },
    animated: { suffix: "3D animated movie style, Pixar Disney animation style, vibrant colors, soft lighting, smooth surfaces, expressive features, highly detailed, cinematic composition, professional 3D render, octane render, unreal engine 5", negativePrompt: "realistic, photorealistic, photograph, raw photo, low quality, blurry, pixelated, ugly, deformed, bad anatomy, text, watermark, signature" },
    cartoon: { suffix: "cartoon style illustration, bold outlines, flat colors, vibrant palette, playful design, clean vector art, comic book style, exaggerated features, expressive, fun aesthetic, professional illustration", negativePrompt: "realistic, photorealistic, photograph, 3d render, anime, low quality, blurry, dark, gritty, text, watermark, signature" },
    anime: { suffix: "anime style, manga illustration, Japanese animation aesthetic, cel shading, vibrant colors, detailed eyes, soft lighting, studio ghibli inspired, beautiful lineart, high quality anime art, detailed background", negativePrompt: "realistic, photorealistic, photograph, western cartoon, 3d render, low quality, blurry, bad anatomy, extra limbs, text, watermark, signature" },
    watercolor: { suffix: "watercolor painting, soft washes, delicate brushstrokes, paper texture, artistic, flowing colors, ethereal atmosphere, hand-painted aesthetic, traditional art, fine art painting, gallery quality", negativePrompt: "photograph, digital art, 3d render, sharp edges, hard lines, low quality, blurry, text, watermark, signature" },
    oil_painting: { suffix: "oil painting masterpiece, rich impasto texture, classical painting technique, museum quality, fine art, dramatic lighting, old masters style, canvas texture, brushstroke details, gallery piece, renaissance inspired", negativePrompt: "photograph, digital art, 3d render, cartoon, anime, flat colors, low quality, blurry, text, watermark, signature" },
    digital_art: { suffix: "digital art illustration, concept art, artstation trending, highly detailed, vibrant colors, dynamic composition, professional digital painting, matte painting, fantasy art style, epic scene", negativePrompt: "photograph, low quality, blurry, amateur, bad anatomy, deformed, text, watermark, signature" },
    sketch: { suffix: "pencil sketch, hand-drawn illustration, artistic sketch, cross-hatching, graphite drawing, professional artist sketch, detailed linework, sketchbook style, raw artistic expression, traditional drawing", negativePrompt: "color, photograph, 3d render, digital art, low quality, blurry, text, watermark, signature" },
    minimalist: { suffix: "minimalist design, clean lines, simple composition, negative space, modern aesthetic, elegant simplicity, geometric shapes, limited color palette, sophisticated design, scandinavian style", negativePrompt: "cluttered, busy, complex, detailed, realistic, photograph, low quality, blurry, text, watermark, signature" },
    vintage: { suffix: "vintage aesthetic, retro style, nostalgic atmosphere, film grain, faded colors, 70s 80s inspired, analog photography feel, warm tones, old-school charm, classic look, polaroid style", negativePrompt: "modern, futuristic, digital, clean, sharp, cartoon, anime, low quality, blurry, text, watermark, signature" }
  };
  return styles[styleType] || styles.realistic;
};

const isPortraitRequest = (promptText: string): boolean => {
  const portraitKeywords = ['retrato', 'portrait', 'rosto', 'face', 'pessoa', 'person', 'homem', 'man', 'mulher', 'woman', 'criança', 'child', 'close-up', 'headshot', 'selfie', 'avatar', 'modelo', 'model', 'executivo', 'executive', 'profissional', 'professional', 'jovem', 'young', 'idoso', 'elderly', 'adulto', 'adult'];
  return portraitKeywords.some(keyword => promptText.toLowerCase().includes(keyword));
};

// Extract image from Gemini direct API response
function extractImageFromResponse(data: any): { imageUrl: string | null; textResponse: string | null } {
  let imageUrl: string | null = null;
  let textResponse: string | null = null;

  // Gemini direct API format: candidates[].content.parts[]
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
    if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const authenticatedUserId = user.id;

    const { data: profile, error: profileError } = await supabase.from('profiles').select('team_id, credits').eq('id', authenticatedUserId).single();
    if (profileError) return new Response(JSON.stringify({ error: 'User profile not found' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const authenticatedTeamId = profile?.team_id || null;

    const body = await req.json();
    if (!body.prompt || typeof body.prompt !== 'string') return new Response(JSON.stringify({ error: 'Prompt inválido' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    if (body.prompt.length > 5000) return new Response(JSON.stringify({ error: 'Prompt muito longo (máximo 5000 caracteres)' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const {
      prompt, brandId, themeId, personaId, platform,
      referenceImages = [], preserveImages = [], styleReferenceImages = [],
      aspectRatio: rawAspectRatio, visualStyle = 'realistic', style = 'auto',
      quality = 'standard', negativePrompt = '', colorPalette = 'auto',
      lighting = 'natural', composition = 'auto', cameraAngle = 'eye_level',
      detailLevel = 7, mood = 'auto',
    } = body;

    // Resolve aspect ratio: request > platform fallback > default 1:1
    const PLATFORM_ASPECT_RATIO_FALLBACK: Record<string, string> = {
      'Instagram': '4:5', 'Facebook': '1:1', 'TikTok': '9:16',
      'LinkedIn': '1:1', 'Twitter/X': '16:9', 'Comunidades': '1:1',
    };
    const aspectRatio = rawAspectRatio || (platform ? PLATFORM_ASPECT_RATIO_FALLBACK[platform] : undefined) || '1:1';

    // Normalize aspect ratio
    const validAspectRatios = ['1:1', '4:5', '9:16', '16:9', '3:4'];
    const aspectRatioMap: Record<string, string> = { '1.91:1': '16:9', '3:4': '4:5' };
    let normalizedAspectRatio = aspectRatioMap[aspectRatio] || aspectRatio;
    if (!validAspectRatios.includes(normalizedAspectRatio)) normalizedAspectRatio = '1:1';

    console.log('Generate Quick Content Request:', { promptLength: prompt.length, brandId, platform, visualStyle, userId: authenticatedUserId });

    // Check credits
    const creditCheck = await checkUserCredits(supabase, authenticatedUserId, CREDIT_COSTS.QUICK_IMAGE);
    if (!creditCheck.hasCredits) return new Response(JSON.stringify({ error: `Créditos insuficientes. Necessário: ${CREDIT_COSTS.QUICK_IMAGE} créditos` }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) return new Response(JSON.stringify({ error: 'GEMINI_API_KEY não configurada.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // =====================================
    // STEP 1: Fetch COMPLETE data from DB in parallel
    // =====================================
    const [brandResult, themeResult, personaResult] = await Promise.all([
      brandId ? supabase.from('brands').select('name, segment, values, keywords, goals, promise, restrictions, brand_color, color_palette').eq('id', brandId).single() : Promise.resolve({ data: null }),
      themeId ? supabase.from('strategic_themes').select('title, description, tone_of_voice, target_audience, objectives, macro_themes, expected_action, best_formats, hashtags').eq('id', themeId).single() : Promise.resolve({ data: null }),
      personaId ? supabase.from('personas').select('name, age, gender, location, professional_context, main_goal, challenges, beliefs_and_interests, interest_triggers, purchase_journey_stage, preferred_tone_of_voice').eq('id', personaId).single() : Promise.resolve({ data: null }),
    ]);

    const brandData = brandResult.data;
    const themeData = themeResult.data;
    const personaData = personaResult.data;
    const brandName = brandData?.name || null;
    const themeName = themeData?.title || null;
    const personaName = personaData?.name || null;

    // =====================================
    // STEP 2: Build briefing & expand with LLM Refiner
    // =====================================
    const briefingSections: string[] = [];
    briefingSections.push(`PEDIDO PRINCIPAL DO USUÁRIO (PRIORIDADE MÁXIMA): ${prompt}`);

    if (brandData) {
      let ctx = `CONTEXTO DA MARCA: ${brandData.name} (${brandData.segment})`;
      if (brandData.values) ctx += ` | Valores: ${brandData.values}`;
      if (brandData.keywords) ctx += ` | Keywords: ${brandData.keywords}`;
      if (brandData.goals) ctx += ` | Objetivos: ${brandData.goals}`;
      if (brandData.promise) ctx += ` | Promessa: ${brandData.promise}`;
      if (brandData.restrictions) ctx += ` | Restrições: ${brandData.restrictions}`;
      briefingSections.push(ctx);
    }
    if (themeData) {
      let ctx = `TEMA ESTRATÉGICO: ${themeData.title}`;
      if (themeData.tone_of_voice) ctx += ` | Tom: ${themeData.tone_of_voice}`;
      if (themeData.target_audience) ctx += ` | Público: ${themeData.target_audience}`;
      if (themeData.objectives) ctx += ` | Objetivos: ${themeData.objectives}`;
      if (themeData.macro_themes) ctx += ` | Macro-temas: ${themeData.macro_themes}`;
      if (themeData.expected_action) ctx += ` | Ação esperada: ${themeData.expected_action}`;
      briefingSections.push(ctx);
    }
    if (personaData) {
      let ctx = `PÚBLICO-ALVO: ${personaData.name} (${personaData.age}, ${personaData.gender})`;
      if (personaData.location) ctx += ` | Local: ${personaData.location}`;
      if (personaData.professional_context) ctx += ` | Contexto: ${personaData.professional_context}`;
      if (personaData.main_goal) ctx += ` | Objetivo: ${personaData.main_goal}`;
      if (personaData.challenges) ctx += ` | Desafios: ${personaData.challenges}`;
      if (personaData.interest_triggers) ctx += ` | Gatilhos: ${personaData.interest_triggers}`;
      briefingSections.push(ctx);
    }
    if (platform) briefingSections.push(`PLATAFORMA: ${platform}`);
    briefingSections.push(`ESTILO VISUAL: ${visualStyle}`);

    const advParts: string[] = [];
    if (colorPalette !== 'auto') advParts.push(`Paleta: ${colorPalette}`);
    if (lighting !== 'natural') advParts.push(`Iluminação: ${lighting}`);
    if (composition !== 'auto') advParts.push(`Composição: ${composition}`);
    if (cameraAngle !== 'eye_level') advParts.push(`Câmera: ${cameraAngle}`);
    if (mood !== 'auto') advParts.push(`Clima: ${mood}`);
    if (detailLevel !== 7) advParts.push(`Detalhe: ${detailLevel}/10`);
    if (advParts.length > 0) briefingSections.push(`CONFIGURAÇÕES VISUAIS: ${advParts.join(' | ')}`);

    const limitedPreserve = preserveImages ? preserveImages.slice(0, 2) : [];
    const limitedStyle = styleReferenceImages ? styleReferenceImages.slice(0, 1) : [];
    if (limitedPreserve.length > 0) briefingSections.push(`IMAGENS DE REFERÊNCIA DA MARCA: ${limitedPreserve.length} imagem(ns) fornecidas.`);
    if (limitedStyle.length > 0) briefingSections.push(`IMAGENS DE REFERÊNCIA DE ESTILO: ${limitedStyle.length} imagem(ns) fornecidas.`);
    if (negativePrompt) briefingSections.push(`ELEMENTOS A EVITAR: ${negativePrompt}`);

    const briefingDocument = briefingSections.join('\n\n');
    console.log('[Step 2] Briefing document built, expanding with LLM...');

    const briefingResult = await expandBriefing({
      briefingDocument,
      visualStyle,
    });

    const visualDescription = briefingResult.expandedPrompt || prompt;
    const styleSettings = getStyleSettings(visualStyle);
    const isPortrait = visualStyle === 'realistic' && isPortraitRequest(prompt);
    let promptSuffix = styleSettings.suffix;
    if (isPortrait) promptSuffix = "high-end portrait photography, hyper-realistic eyes with catchlight, detailed skin pores, masterpiece, 8k, shot on 85mm lens, f/1.4, cinematic lighting, sharp focus on eyes, natural skin tone, professional studio lighting";

    // Build image role prefix
    const hasAnyRefImages = limitedPreserve.length > 0 || limitedStyle.length > 0;
    let imageRolePrefix = '';
    if (hasAnyRefImages) {
      const roleParts: string[] = [];
      if (limitedPreserve.length > 0) roleParts.push(`A(s) primeira(s) ${limitedPreserve.length} imagem(ns) definem a Identidade Visual e Paleta de Cores obrigatória`);
      if (limitedStyle.length > 0) roleParts.push(`A(s) última(s) servem apenas como inspiração de composição`);
      imageRolePrefix = `${roleParts.join('. ')}.\n\n`;
    }

    // Add dimension enforcement instruction
    const ASPECT_RATIO_DIMENSIONS: Record<string, { width: number; height: number }> = {
      '1:1': { width: 1080, height: 1080 },
      '4:5': { width: 1080, height: 1350 },
      '5:4': { width: 1080, height: 864 },
      '9:16': { width: 1080, height: 1920 },
      '16:9': { width: 1920, height: 1080 },
      '3:4': { width: 1080, height: 1440 },
      '4:3': { width: 1080, height: 810 },
      '2:3': { width: 1080, height: 1620 },
      '3:2': { width: 1080, height: 720 },
      '21:9': { width: 1920, height: 823 },
      '1.91:1': { width: 1200, height: 630 },
    };
    const GEMINI_SUPPORTED_RATIOS = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'];
    const geminiAspectRatio = GEMINI_SUPPORTED_RATIOS.includes(normalizedAspectRatio) 
      ? normalizedAspectRatio 
      : (normalizedAspectRatio === '1.91:1' ? '16:9' : undefined);
    console.log('[Step 2] Aspect ratio:', normalizedAspectRatio, '-> Gemini:', geminiAspectRatio);
    const dims = ASPECT_RATIO_DIMENSIONS[normalizedAspectRatio];
    const dimensionPrefix = dims
      ? `⚠️ DIMENSÃO OBRIGATÓRIA: A imagem DEVE ser gerada com proporção EXATA de ${normalizedAspectRatio} (${dims.width}x${dims.height}px). IGNORE as proporções de qualquer imagem de referência. O OUTPUT deve ter EXATAMENTE esta proporção.\n\n`
      : '';

    let userPrompt = `${dimensionPrefix}${imageRolePrefix}INSTRUÇÃO PRINCIPAL: ${prompt.trim()}\n\nDETALHES VISUAIS: ${visualDescription}, ${promptSuffix}`;

    // Build negative prompt - quick content NEVER has text overlay
    let negativePromptFinal = styleSettings.negativePrompt;
    if (negativePrompt && negativePrompt.trim()) negativePromptFinal = `${negativePrompt.trim()}, ${negativePromptFinal}`;
    negativePromptFinal += ', text, watermark, typography, letters, signature, words, labels, do not follow reference image dimensions or aspect ratio';

    userPrompt += `\n\n[AVOID] ${negativePromptFinal}`;
    console.log('[Step 3] Final prompt length:', userPrompt.length, 'chars');

    // =====================================
    // STEP 3: Build message content with images
    // =====================================
    const messageContent: any[] = [{ type: 'text', text: userPrompt }];

    for (const img of limitedPreserve) {
      if (img) messageContent.push({ type: 'image_url', image_url: { url: img } });
    }
    if (referenceImages?.length > 0 && !limitedStyle.length) {
      for (const img of referenceImages.slice(0, 1)) {
        if (img) messageContent.push({ type: 'image_url', image_url: { url: img } });
      }
    }
    for (const img of limitedStyle) {
      if (img) messageContent.push({ type: 'image_url', image_url: { url: img } });
    }

    console.log(`[Step 3] Message parts: ${messageContent.length} (1 text + ${messageContent.length - 1} images)`);

    // =====================================
    // STEP 4: Generate image via Gateway with retry
    // =====================================
    const MAX_RETRIES = 3;
    let lastError: any = null;
    let imageUrl: string | null = null;
    let textResponse: string | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        console.log(`[Step 4] Image generation attempt ${attempt}/${MAX_RETRIES}...`);

        const geminiParts = convertToGeminiParts(messageContent);
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: geminiParts }],
            generationConfig: {
              responseModalities: ['IMAGE', 'TEXT'],
              ...(geminiAspectRatio ? { imageConfig: { aspectRatio: geminiAspectRatio } } : {}),
            },
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Gemini error (attempt ${attempt}):`, response.status, errorText);

          if (response.status === 429) return new Response(JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns instantes.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          if (response.status === 402) return new Response(JSON.stringify({ error: 'Créditos de IA esgotados.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

          if (response.status === 400) {
            if (errorText.includes('SAFETY') || errorText.includes('policy')) {
              return new Response(JSON.stringify({ error: 'O conteúdo solicitado viola as políticas de uso. Tente um prompt diferente.', isComplianceError: true }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }
          }

          lastError = new Error(`Gemini error: ${response.status}`);
          if (attempt < MAX_RETRIES) { await new Promise(r => setTimeout(r, 2000)); continue; }
          throw lastError;
        }

        const data = await response.json();
        const extracted = extractImageFromResponse(data);
        imageUrl = extracted.imageUrl;
        textResponse = extracted.textResponse;

        if (!imageUrl) {
          if (textResponse) {
            return new Response(JSON.stringify({ error: 'O modelo não conseguiu gerar a imagem. Tente um prompt diferente.', isComplianceError: true, modelResponse: textResponse }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
          throw new Error('No image found in response');
        }

        console.log(`[Step 4] Image generated on attempt ${attempt}`);
        break;

      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error);
        lastError = error;
        if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, 2000));
      }
    }

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: 'Não foi possível gerar a imagem. Tente novamente.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // =====================================
    // STEP 5: Upload to Storage
    // =====================================
    console.log('[Step 5] Uploading image to storage...');
    const timestamp = Date.now();
    const randomId = crypto.randomUUID();
    const fileName = `quick-content/${authenticatedTeamId || authenticatedUserId}/${timestamp}-${randomId}.png`;

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
      // Fallback: return base64 directly
      console.warn('Falling back to base64 response');
    }

    let finalImageUrl = imageUrl;
    if (!uploadError) {
      const { data: { publicUrl } } = supabase.storage.from('content-images').getPublicUrl(fileName);
      finalImageUrl = publicUrl;
      console.log('[Step 5] Image uploaded:', publicUrl);
    }

    // Deduct credits
    const deductResult = await deductUserCredits(supabase, authenticatedUserId, CREDIT_COSTS.QUICK_IMAGE);
    if (!deductResult.success) console.error('Error deducting credits:', deductResult.error);

    await recordUserCreditUsage(supabase, {
      userId: authenticatedUserId,
      teamId: authenticatedTeamId,
      actionType: 'QUICK_IMAGE',
      creditsUsed: CREDIT_COSTS.QUICK_IMAGE,
      creditsBefore: creditCheck.currentCredits,
      creditsAfter: deductResult.newCredits,
      description: 'Criação rápida de imagem (Pipeline v4)',
      metadata: { platform, aspectRatio: normalizedAspectRatio, style, brandId, model: 'gemini-2.5-flash-image' }
    });

    // Save action
    const { data: actionData, error: actionError } = await supabase.from('actions').insert({
      user_id: authenticatedUserId,
      team_id: authenticatedTeamId || null,
      type: 'CRIAR_CONTEUDO_RAPIDO',
      status: 'completed',
      brand_id: brandId || null,
      asset_path: !uploadError ? fileName : null,
      thumb_path: !uploadError ? fileName : null,
      details: { prompt, platform, aspectRatio: normalizedAspectRatio, style, quality, colorPalette, lighting, composition, cameraAngle, detailLevel, mood, negativePrompt: !!negativePrompt, hasReferenceImages: referenceImages?.length > 0, hasPreserveImages: preserveImages?.length > 0, hasStyleReferenceImages: styleReferenceImages?.length > 0, themeId, personaId, pipeline: 'quick_v4' },
      result: { imageUrl: finalImageUrl, textResponse, generatedAt: new Date().toISOString() }
    }).select().single();

    if (actionError) console.error('Error saving action:', actionError);

    return new Response(JSON.stringify({
      success: true,
      imageUrl: finalImageUrl,
      textResponse,
      actionId: actionData?.id,
      creditsUsed: CREDIT_COSTS.QUICK_IMAGE,
      creditsRemaining: deductResult.newCredits,
      brandName, themeName, personaName, platform
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error in generate-quick-content:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
