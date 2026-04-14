import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { CREDIT_COSTS } from '../_shared/creditCosts.ts';
import { checkUserCredits, deductUserCredits, recordUserCreditUsage } from '../_shared/userCredits.ts';
import { expandBriefing } from '../_shared/expandBriefing.ts';
import { postProcessImage, resolveAspectRatio, normalizeAspectRatioForGemini, ASPECT_RATIO_DIMENSIONS, decodeBase64Image } from '../_shared/imagePostProcess.ts';
import { checkCompliance, type ComplianceResult } from '../_shared/complianceCheck.ts';
import {
  cleanInput,
  normalizeImageArray,
  getStyleSettings,
  isPortraitRequest,
  buildBriefingDocument,
  buildDirectorPrompt,
  extractImageFromResponse,
  convertToGeminiParts,
  fetchApprovedFeedbackImages,
  buildFeedbackMessageParts,
  uint8ArrayToBase64,
} from '../_shared/imagePromptBuilder.ts';
import { expandBriefing } from '../_shared/expandBriefing.ts';
import { postProcessImage, resolveAspectRatio, normalizeAspectRatioForGemini, ASPECT_RATIO_DIMENSIONS, decodeBase64Image } from '../_shared/imagePostProcess.ts';
import {
  cleanInput,
  normalizeImageArray,
  getStyleSettings,
  isPortraitRequest,
  buildBriefingDocument,
  buildDirectorPrompt,
  extractImageFromResponse,
  convertToGeminiParts,
  fetchApprovedFeedbackImages,
  buildFeedbackMessageParts,
  uint8ArrayToBase64,
} from '../_shared/imagePromptBuilder.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

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
      referenceImages = [], preserveImages: rawPreserveImages = [], styleReferenceImages: rawStyleReferenceImages = [],
      aspectRatio: rawAspectRatio, visualStyle = 'realistic', style = 'auto',
      quality = 'standard', negativePrompt = '', colorPalette = 'auto',
      lighting = 'natural', composition = 'auto', cameraAngle = 'eye_level',
      detailLevel = 7, mood = 'auto', mode = 'quick',
    } = body;

    const isMarketplace = mode === 'marketplace';
    const creditCost = isMarketplace ? CREDIT_COSTS.MARKETPLACE_IMAGE : CREDIT_COSTS.QUICK_IMAGE;

    // Resolve aspect ratio
    const resolved = resolveAspectRatio({ aspectRatio: rawAspectRatio, width: body.width, height: body.height, platform });
    const normalizedAspectRatio = resolved.aspectRatio;
    const aspectRatioSource = resolved.source;

    console.log('[Quick] Request:', { promptLength: prompt.length, brandId, platform, visualStyle, userId: authenticatedUserId, aspectRatio: normalizedAspectRatio });

    // Check credits
    const creditCheck = await checkUserCredits(supabase, authenticatedUserId, creditCost);
    if (!creditCheck.hasCredits) return new Response(JSON.stringify({ error: `Créditos insuficientes. Necessário: ${creditCost} créditos` }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    if (!GEMINI_API_KEY) return new Response(JSON.stringify({ error: 'GEMINI_API_KEY não configurada.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

    // =====================================
    // STEP 1: Fetch COMPLETE data from DB in parallel
    // =====================================
    const [brandResult, themeResult, personaResult, stylePrefsResult, approvedFeedbackResult] = await Promise.all([
      brandId ? supabase.from('brands').select('name, segment, values, keywords, goals, promise, restrictions, brand_color, color_palette').eq('id', brandId).single() : Promise.resolve({ data: null }),
      themeId ? supabase.from('strategic_themes').select('title, description, tone_of_voice, target_audience, objectives, macro_themes, expected_action, best_formats, hashtags').eq('id', themeId).single() : Promise.resolve({ data: null }),
      personaId ? supabase.from('personas').select('name, age, gender, location, professional_context, main_goal, challenges, beliefs_and_interests, interest_triggers, purchase_journey_stage, preferred_tone_of_voice').eq('id', personaId).single() : Promise.resolve({ data: null }),
      brandId ? supabase.from('brand_style_preferences').select('positive_patterns, negative_patterns, style_summary, total_positive, total_negative').eq('brand_id', brandId).maybeSingle() : Promise.resolve({ data: null }),
      brandId ? supabase.from('creation_feedback').select('image_url, thumb_path, actions(details, result)').eq('brand_id', brandId).eq('rating', 'positive').not('image_url', 'is', null).order('created_at', { ascending: false }).limit(3) : Promise.resolve({ data: null }),
    ]);

    const brandData = brandResult.data;
    const themeData = themeResult.data;
    const personaData = personaResult.data;
    const stylePrefs = stylePrefsResult.data;
    const brandName = brandData?.name || null;
    const themeName = themeData?.title || null;
    const personaName = personaData?.name || null;
    const approvedFeedbackImages = approvedFeedbackResult?.data || [];

    // Fetch approved feedback images as base64
    const feedbackBase64Images = await fetchApprovedFeedbackImages(supabaseUrl, approvedFeedbackImages, '[Quick]');

    console.log('[Quick Step 1] Data fetched:', { brand: !!brandData, theme: !!themeData, persona: !!personaData, stylePrefs: !!stylePrefs, approvedImages: feedbackBase64Images.length });

    // =====================================
    // STEP 2: Build Briefing Document & Expand with LLM Refiner
    // (Map quick content params to the full pipeline format)
    // =====================================
    const formData = {
      description: prompt,
      platform,
      objective: '',
      tone: [],
      additionalInfo: '',
      contentType: 'organic',
      visualStyle,
      negativePrompt,
      colorPalette,
      lighting,
      composition,
      cameraAngle,
      detailLevel,
      mood,
      preserveImages: rawPreserveImages,
      styleReferenceImages: rawStyleReferenceImages,
    };

    const briefingDocument = buildBriefingDocument(formData, brandData, themeData, personaData, stylePrefs);
    console.log('[Quick Step 2] Briefing document:', briefingDocument.length, 'chars');

    const briefingResult = await expandBriefing({
      briefingDocument,
      visualStyle,
      hasTextOverlay: false,
      tones: [],
      brandData,
      themeData,
      personaData,
      platform: cleanInput(platform),
    });

    console.log('[Quick Step 2] Refiner result:', {
      hasVisual: !!briefingResult.expandedPrompt,
      headline: briefingResult.headline,
      subtexto: briefingResult.subtexto,
      legendaLength: briefingResult.legenda?.length || 0,
    });

    // =====================================
    // STEP 3: Build Master Prompt using shared buildDirectorPrompt
    // =====================================
    const description = cleanInput(prompt);
    const styleSettings = getStyleSettings(visualStyle);
    const isPortrait = visualStyle === 'realistic' && isPortraitRequest(description);
    let finalStyleSuffix = styleSettings.suffix;
    if (isPortrait) {
      finalStyleSuffix = "high-end portrait photography, hyper-realistic eyes with catchlight, detailed skin pores, masterpiece, 8k, shot on 85mm lens, f/1.4, cinematic lighting, sharp focus on eyes, natural skin tone, professional studio lighting";
    }

    const enrichedDescription = briefingResult.expandedPrompt || description;

    // Normalize reference images
    const limitedPreserve = normalizeImageArray(rawPreserveImages, 3);
    const limitedStyle = normalizeImageArray(rawStyleReferenceImages, 3);
    const fallbackImages = (limitedPreserve.length === 0 && limitedStyle.length === 0 && referenceImages?.length > 0)
      ? normalizeImageArray(referenceImages, 3)
      : [];

    const preserveImagesCount = limitedPreserve.length;
    const styleReferenceImagesCount = limitedStyle.length + fallbackImages.length;

    const masterPrompt = buildDirectorPrompt({
      originalDescription: description,
      enrichedDescription,
      brandData,
      themeData,
      personaData,
      platform: cleanInput(platform),
      contentType: 'organic',
      objective: description,
      tones: [],
      visualStyle,
      styleSuffix: finalStyleSuffix,
      includeText: false,
      textContent: '',
      textPosition: 'center',
      fontStyle: 'modern',
      textDesignStyle: 'clean',
      preserveImagesCount,
      styleReferenceImagesCount,
      headline: briefingResult.headline || '',
      subtexto: briefingResult.subtexto || '',
      ctaText: '',
      adProfessionalMode: false,
      priceText: '',
      includeBrandLogo: false,
      aspectRatio: normalizedAspectRatio,
      colorPalette,
      lighting,
      composition,
      cameraAngle,
      detailLevel,
      mood,
      negativePrompt: cleanInput(negativePrompt),
    });

    // Build image role prefix
    const hasAnyRefImages = limitedPreserve.length > 0 || limitedStyle.length > 0 || fallbackImages.length > 0;
    let imageRolePrefix = '';
    if (hasAnyRefImages) {
      const roleParts: string[] = [];
      if (isMarketplace) {
        roleParts.push('⚠️ MODO MARKETPLACE/E-COMMERCE — REGRA ABSOLUTA DE PRESERVAÇÃO:');
        roleParts.push('As imagens de referência são FOTOS REAIS DO PRODUTO. O produto deve aparecer 100% IDÊNTICO à foto original — mesma forma, cores, rótulos, texturas, proporções, logotipos, tipografia da embalagem e TODOS os detalhes visuais');
        roleParts.push('NÃO redesenhe, NÃO estilize, NÃO simplifique, NÃO altere cores, NÃO invente detalhes, NÃO remova elementos do produto. O produto é INTOCÁVEL');
        roleParts.push('Sua ÚNICA tarefa é: 1) Extrair/recortar o produto da foto original preservando-o pixel a pixel; 2) Ambientar e modular o produto em um cenário/fundo profissional de catálogo; 3) Ajustar apenas iluminação e sombras para integração natural na cena');
        roleParts.push('O produto REAL da foto é o elemento central. Trate como se fosse uma montagem fotográfica: o produto é colado intacto sobre o novo fundo');
      } else {
        if (limitedPreserve.length > 0) roleParts.push(`As imagens marcadas como PRESERVAR definem a Identidade Visual, paleta de cores e elementos obrigatórios — NÃO altere esses elementos`);
        if (limitedStyle.length > 0 || fallbackImages.length > 0) roleParts.push(`As imagens de referência definem o estilo visual, composição, cores e atmosfera desejados — use como inspiração forte`);
      }
      roleParts.push('⚠️ IMPORTANTE: Use as imagens de referência como BASE VISUAL OBRIGATÓRIA. Cores, estilo, composição e atmosfera devem refletir as referências fornecidas');
      roleParts.push('⚠️ PROPORÇÕES DAS REFERÊNCIAS: IGNORE as proporções e dimensões das imagens de referência. O formato de saída é definido EXCLUSIVAMENTE pelo aspect ratio solicitado');
      imageRolePrefix = `${roleParts.join('. ')}.\n\n`;
    }

    // Build negative prompt
    let negativePromptFinal = styleSettings.negativePrompt;
    if (negativePrompt && negativePrompt.trim()) negativePromptFinal = `${negativePrompt.trim()}, ${negativePromptFinal}`;
    negativePromptFinal += ', text, watermark, typography, letters, signature, words, labels, do not follow reference image dimensions or aspect ratio';
    if (isMarketplace) {
      negativePromptFinal += ', do not redesign the product, do not change product colors, do not alter product shape, do not stylize or cartoon the product, do not simplify product details, do not invent new product features';
    }

    // Aspect ratio config
    const geminiAspectRatio = normalizeAspectRatioForGemini(normalizedAspectRatio);
    const dims = ASPECT_RATIO_DIMENSIONS[normalizedAspectRatio] || ASPECT_RATIO_DIMENSIONS['1:1'];

    const dimensionPrefix = `⚠️ DIMENSÃO OBRIGATÓRIA: A imagem DEVE ser gerada com proporção EXATA de ${normalizedAspectRatio} (${dims.width}x${dims.height}px). IGNORE as proporções de qualquer imagem de referência. O OUTPUT deve ter EXATAMENTE esta proporção.\n\n`;
    const finalPrompt = `${dimensionPrefix}${imageRolePrefix}${masterPrompt}\n\n[AVOID] ${negativePromptFinal}`;

    console.log('[Quick Step 3] Final prompt length:', finalPrompt.length, 'chars');

    // =====================================
    // STEP 4: Build message content with images
    // =====================================
    const messageContent: any[] = [{ type: 'text', text: finalPrompt }];

    for (const img of limitedPreserve) {
      if (img) messageContent.push({ type: 'image_url', image_url: { url: img } });
    }
    for (const img of limitedStyle) {
      if (img) messageContent.push({ type: 'image_url', image_url: { url: img } });
    }
    for (const img of fallbackImages) {
      if (img) messageContent.push({ type: 'image_url', image_url: { url: img } });
    }

    // Add approved feedback images + config as style references
    const totalManualImages = limitedPreserve.length + limitedStyle.length + fallbackImages.length;
    const feedbackSlots = Math.max(0, 5 - totalManualImages);
    if (feedbackBase64Images.length > 0 || approvedFeedbackImages.length > 0) {
      const { feedbackInstruction, feedbackImagesToAdd } = buildFeedbackMessageParts(
        approvedFeedbackImages,
        feedbackBase64Images,
        feedbackSlots,
      );
      messageContent.push({ type: 'text', text: feedbackInstruction });
      for (const img of feedbackImagesToAdd) {
        messageContent.push({ type: 'image_url', image_url: { url: img } });
      }
      console.log(`[Quick Step 4] Added ${feedbackImagesToAdd.length} approved feedback images as style references`);
    }

    console.log(`[Quick Step 4] Message parts: ${messageContent.length} (text + images)`);

    // =====================================
    // STEP 5: Generate image via Gemini Direct API (same model as generate-image)
    // =====================================
    const MAX_RETRIES = 3;
    const REQUEST_TIMEOUT_MS = 90000;
    const PRIMARY_IMAGE_MODEL = 'gemini-3-pro-image-preview';
    const FALLBACK_IMAGE_MODEL = 'gemini-2.5-flash-image';

    let lastError: any = null;
    let imageUrl: string | null = null;
    let textResponse: string | null = null;
    let usedImageModel = PRIMARY_IMAGE_MODEL;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const modelForAttempt = attempt <= 2 ? PRIMARY_IMAGE_MODEL : FALLBACK_IMAGE_MODEL;
        usedImageModel = modelForAttempt;

        console.log(`[Quick Step 5] Image generation attempt ${attempt}/${MAX_RETRIES} with model ${modelForAttempt}...`);

        const geminiParts = convertToGeminiParts(messageContent);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelForAttempt}:generateContent?key=${GEMINI_API_KEY}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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

          if (response.status === 429) return new Response(JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns instantes.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          if (response.status === 402) return new Response(JSON.stringify({ error: 'Créditos de IA esgotados.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

          if (response.status === 400) {
            if (errorText.includes('SAFETY') || errorText.includes('policy')) {
              return new Response(JSON.stringify({ error: 'O conteúdo solicitado viola as políticas de uso. Tente um prompt diferente.', isComplianceError: true }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
            }
          }

          lastError = new Error(`Gemini error (${modelForAttempt}): ${response.status}`);
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
          throw new Error(`No image found in response for model ${modelForAttempt}`);
        }

        console.log(`[Quick Step 5] Image generated on attempt ${attempt} with model ${modelForAttempt}`);
        break;

      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error);
        lastError = error;
        const isAbort = error instanceof Error && error.name === 'AbortError';
        if (isAbort) console.error(`[Quick Step 5] Timeout after ${REQUEST_TIMEOUT_MS}ms (attempt ${attempt})`);
        if (attempt < MAX_RETRIES) await new Promise(r => setTimeout(r, 2000));
      }
    }

    if (!imageUrl) {
      return new Response(JSON.stringify({ error: 'Não foi possível gerar a imagem. Tente novamente.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // =====================================
    // STEP 6: Post-process image
    // =====================================
    console.log('[Quick Step 6] Post-processing image to exact dimensions...');

    let rawBinaryData: Uint8Array;
    if (imageUrl.startsWith('data:')) {
      rawBinaryData = decodeBase64Image(imageUrl);
    } else {
      const imgResp = await fetch(imageUrl);
      rawBinaryData = new Uint8Array(await imgResp.arrayBuffer());
    }

    const postProcessResult = await postProcessImage(rawBinaryData, normalizedAspectRatio, dims.width, dims.height);

    console.log('[Quick Step 6] Post-process result:', {
      finalWidth: postProcessResult.finalWidth,
      finalHeight: postProcessResult.finalHeight,
      wasCropped: postProcessResult.wasCropped,
      wasResized: postProcessResult.wasResized,
    });

    // =====================================
    // STEP 7: Upload to Storage
    // =====================================
    console.log('[Quick Step 7] Uploading post-processed image to storage...');
    const timestamp = Date.now();
    const randomId = crypto.randomUUID();
    const fileName = `quick-content/${authenticatedTeamId || authenticatedUserId}/${timestamp}-${randomId}.png`;

    const { error: uploadError } = await supabase.storage.from('content-images').upload(fileName, postProcessResult.processedData, { contentType: 'image/png', upsert: false });
    
    let finalImageUrl: string;
    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      const base64Fallback = uint8ArrayToBase64(postProcessResult.processedData);
      finalImageUrl = `data:image/png;base64,${base64Fallback}`;
      console.warn('[Quick Step 7] Upload failed, returning post-processed base64 fallback');
    } else {
      const { data: { publicUrl } } = supabase.storage.from('content-images').getPublicUrl(fileName);
      finalImageUrl = publicUrl;
      console.log('[Quick Step 7] Image uploaded:', publicUrl);
    }

    // =====================================
    // STEP 8: Generate caption by analyzing the created image
    // =====================================
    console.log('[Quick Step 8] Generating caption from image analysis...');

    let captionData: { titulo: string; legenda: string; cta: string; hashtags: string[] } = {
      titulo: '', legenda: '', cta: '', hashtags: []
    };

    try {
      const CAPTION_MODEL = 'gemini-2.5-flash';
      const brandContext = brandData ? `\nContexto da marca: "${brandData.name}" - Segmento: ${brandData.segment || 'não especificado'}. Valores: ${brandData.values || 'não especificado'}. Palavras-chave: ${brandData.keywords || 'não especificado'}.` : '';
      const themeContext = themeData ? `\nTema estratégico: "${themeData.title}" - Tom de voz: ${themeData.tone_of_voice || 'não especificado'}. Público-alvo: ${themeData.target_audience || 'não especificado'}. Hashtags sugeridas do tema: ${themeData.hashtags || 'não especificado'}.` : '';
      const personaContext = personaData ? `\nPersona: "${personaData.name}" - ${personaData.age}, ${personaData.gender}. Objetivo: ${personaData.main_goal || 'não especificado'}. Tom preferido: ${personaData.preferred_tone_of_voice || 'não especificado'}.` : '';
      const platformContext = platform ? `\nPlataforma: ${platform}.` : '';

      const captionPrompt = `Você é um social media manager expert. Analise esta imagem e crie uma legenda completa para redes sociais.
${brandContext}${themeContext}${personaContext}${platformContext}

Responda APENAS com um JSON válido (sem markdown, sem \`\`\`), com EXATAMENTE esta estrutura:
{
  "titulo": "Um título curto e impactante (máx 10 palavras)",
  "legenda": "Um parágrafo de legenda envolvente e natural para redes sociais (3-5 frases)",
  "cta": "Uma frase de call-to-action convidativa",
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5"]
}

REGRAS:
- O título deve capturar a essência da imagem
- A legenda deve ser envolvente, natural e conectar com o público
- O CTA deve incentivar engajamento (comentar, compartilhar, salvar)
- Exatamente 5 hashtags relevantes
- Tudo em português brasileiro
- NÃO use emojis excessivos (máximo 2-3 no total)`;

      // Build image part for Gemini
      const imageBase64 = uint8ArrayToBase64(postProcessResult.processedData);
      const captionResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${CAPTION_MODEL}:generateContent?key=${GEMINI_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              { text: captionPrompt },
              { inlineData: { mimeType: 'image/png', data: imageBase64 } }
            ]
          }],
          generationConfig: { temperature: 0.7, maxOutputTokens: 4096 },
        }),
      });

      if (captionResponse.ok) {
        const captionResult = await captionResponse.json();
        const captionText = captionResult?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        console.log('[Quick Step 8] Raw caption response length:', captionText.length, 'preview:', captionText.substring(0, 300));

        // Parse JSON from response
        try {
          const jsonMatch = captionText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            captionData = {
              titulo: parsed.titulo || '',
              legenda: parsed.legenda || '',
              cta: parsed.cta || '',
              hashtags: Array.isArray(parsed.hashtags) ? parsed.hashtags.slice(0, 5) : [],
            };
            console.log('[Quick Step 8] Caption generated:', { titulo: captionData.titulo, legendaLen: captionData.legenda.length, cta: captionData.cta, hashtagCount: captionData.hashtags.length });
          } else {
            console.error('[Quick Step 8] No JSON found in caption response');
          }
        } catch (parseError) {
          console.error('[Quick Step 8] JSON parse error:', parseError, 'raw text:', captionText.substring(0, 500));
        }
      } else {
        console.error('[Quick Step 8] Caption generation failed:', captionResponse.status, await captionResponse.text());
      }
    } catch (captionError) {
      console.error('[Quick Step 8] Caption generation error:', captionError);
    }

    // Deduct credits
    const deductResult = await deductUserCredits(supabase, authenticatedUserId, creditCost);
    if (!deductResult.success) console.error('Error deducting credits:', deductResult.error);

    await recordUserCreditUsage(supabase, {
      userId: authenticatedUserId,
      teamId: authenticatedTeamId,
      actionType: isMarketplace ? 'MARKETPLACE_IMAGE' : 'QUICK_IMAGE',
      creditsUsed: creditCost,
      creditsBefore: creditCheck.currentCredits,
      creditsAfter: deductResult.newCredits,
      description: isMarketplace ? 'Imagem de produto para marketplace' : 'Criação rápida de imagem (Pipeline Unificado v6)',
      metadata: { platform, aspectRatio: normalizedAspectRatio, style, brandId, model: usedImageModel, aspectRatioSource, mode }
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
      details: {
        prompt, description: prompt, platform, aspectRatio: normalizedAspectRatio, style, quality,
        visualStyle, colorPalette, lighting, composition, cameraAngle, detailLevel, mood,
        negativePrompt: !!negativePrompt,
        hasReferenceImages: referenceImages?.length > 0,
        hasPreserveImages: rawPreserveImages?.length > 0,
        hasStyleReferenceImages: rawStyleReferenceImages?.length > 0,
        themeId, personaId, pipeline: 'unified_v7',
        requestedAspectRatio: normalizedAspectRatio, aspectRatioSource, mode
      },
      result: {
        imageUrl: finalImageUrl,
        textResponse,
        headline: captionData.titulo || null,
        title: captionData.titulo || null,
        legenda: captionData.legenda || null,
        body: captionData.legenda || null,
        cta: captionData.cta || null,
        hashtags: captionData.hashtags.length > 0 ? captionData.hashtags : null,
        generatedAt: new Date().toISOString(),
        finalWidth: postProcessResult.finalWidth,
        finalHeight: postProcessResult.finalHeight,
        finalAspectRatio: postProcessResult.finalAspectRatio,
        requestedAspectRatio: postProcessResult.requestedAspectRatio,
        wasCropped: postProcessResult.wasCropped,
        wasResized: postProcessResult.wasResized,
      }
    }).select().single();

    if (actionError) console.error('Error saving action:', actionError);

    return new Response(JSON.stringify({
      success: true,
      imageUrl: finalImageUrl,
      textResponse,
      headline: captionData.titulo || null,
      legenda: captionData.legenda || null,
      cta: captionData.cta || null,
      hashtags: captionData.hashtags.length > 0 ? captionData.hashtags : null,
      actionId: actionData?.id,
      creditsUsed: creditCost,
      creditsRemaining: deductResult.newCredits,
      brandName, themeName, personaName, platform,
      finalWidth: postProcessResult.finalWidth,
      finalHeight: postProcessResult.finalHeight,
      finalAspectRatio: postProcessResult.finalAspectRatio,
      requestedAspectRatio: postProcessResult.requestedAspectRatio,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error in generate-quick-content:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
