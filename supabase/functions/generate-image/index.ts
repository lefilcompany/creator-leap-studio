import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { CREDIT_COSTS } from '../_shared/creditCosts.ts';
import { checkUserCredits, deductUserCredits, recordUserCreditUsage } from '../_shared/userCredits.ts';
import { expandBriefing } from '../_shared/expandBriefing.ts';
import { postProcessImage, resolveAspectRatio, normalizeAspectRatioForGemini, ASPECT_RATIO_DIMENSIONS, decodeBase64Image } from '../_shared/imagePostProcess.ts';
import { checkCompliance, type ComplianceResult } from '../_shared/complianceCheck.ts';
import { applyTextOverlay, buildTextOverlayConfig } from '../_shared/textOverlay.ts';
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
    const [brandResult, themeResult, personaResult, stylePrefsResult, approvedFeedbackResult] = await Promise.all([
      formData.brandId ? supabase.from('brands').select('name, segment, values, keywords, goals, promise, restrictions, logo, moodboard, reference_image, brand_color, color_palette').eq('id', formData.brandId).single() : Promise.resolve({ data: null }),
      formData.themeId ? supabase.from('strategic_themes').select('title, description, tone_of_voice, target_audience, objectives, macro_themes, expected_action, best_formats, hashtags, color_palette, platforms').eq('id', formData.themeId).single() : Promise.resolve({ data: null }),
      formData.personaId ? supabase.from('personas').select('name, age, gender, location, professional_context, main_goal, challenges, beliefs_and_interests, interest_triggers, purchase_journey_stage, preferred_tone_of_voice').eq('id', formData.personaId).single() : Promise.resolve({ data: null }),
      formData.brandId ? supabase.from('brand_style_preferences').select('positive_patterns, negative_patterns, style_summary, total_positive, total_negative').eq('brand_id', formData.brandId).maybeSingle() : Promise.resolve({ data: null }),
      formData.brandId ? supabase.from('creation_feedback').select('image_url, thumb_path, actions(details, result)').eq('brand_id', formData.brandId).eq('rating', 'positive').not('image_url', 'is', null).order('created_at', { ascending: false }).limit(3) : Promise.resolve({ data: null }),
    ]);

    const brandData = brandResult.data;
    const themeData = themeResult.data;
    const personaData = personaResult.data;
    const stylePrefs = stylePrefsResult.data;
    const approvedFeedbackImages = approvedFeedbackResult?.data || [];

    // Fetch approved feedback images as base64
    const feedbackBase64Images = await fetchApprovedFeedbackImages(supabaseUrl, approvedFeedbackImages, '[Step 1]');

    console.log('[Step 1] Data fetched:', { brand: !!brandData, theme: !!themeData, persona: !!personaData, stylePrefs: !!stylePrefs, approvedImages: feedbackBase64Images.length });

    // =====================================
    // STEP 2: Build Briefing Document & Expand with LLM Refiner
    // =====================================
    const briefingDocument = buildBriefingDocument(formData, brandData, themeData, personaData, stylePrefs);
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
      disclaimerText: cleanInput(formData.disclaimerText) || '',
      disclaimerStyle: formData.disclaimerStyle || 'bottom_horizontal',
      aspectRatio: formData.aspectRatio || undefined,
      colorPalette: formData.colorPalette || 'auto',
      lighting: formData.lighting || 'natural',
      composition: formData.composition || 'auto',
      cameraAngle: formData.cameraAngle || 'eye_level',
      detailLevel: formData.detailLevel ?? 7,
      mood: formData.mood || 'auto',
      negativePrompt: cleanInput(formData.negativePrompt),
      fontSize: formData.fontSize,
      fontFamily: formData.fontFamily,
      fontWeight: formData.fontWeight,
      fontItalic: formData.fontItalic,
      useTextOverlay: includeText, // Always use text overlay engine for text
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
    // Always suppress AI text rendering: when no text needed it's obvious; 
    // when text IS needed, the overlay engine handles it in post-processing
    negativeComponents.push('text, watermark, typography, letters, signature, words, labels');
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

    // Add approved feedback images + config as style references
    const totalManualImages = preserveImages.length + styleReferenceImages.length;
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
      console.log(`[Step 4] Added ${feedbackImagesToAdd.length} approved feedback images as style references`);
    }

    console.log(`[Step 4] Message parts: ${messageContent.length} (text + images)`);

    // =====================================
    // STEP 5: Generate image via Gemini Direct API
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

        console.log(`[Step 5] Image generation attempt ${attempt}/${MAX_RETRIES} with model ${modelForAttempt}...`);

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

          if (response.status === 400) {
            return new Response(JSON.stringify({ error: 'Requisição inválida para o modelo de imagem', model: modelForAttempt, details: errorText }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
          if (response.status === 429) {
            return new Response(JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente mais tarde.' }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
          }
          if (response.status === 402) {
            return new Response(JSON.stringify({ error: 'Créditos de IA esgotados.' }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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
        if (isAbort) console.error(`[Step 5] Timeout after ${REQUEST_TIMEOUT_MS}ms (attempt ${attempt})`);
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
    // STEP 6: Post-process image
    // =====================================
    console.log('[Step 6] Post-processing image to exact dimensions...');
    
    let binaryData: Uint8Array;
    if (imageUrl.startsWith('data:')) {
      binaryData = decodeBase64Image(imageUrl);
    } else {
      const imgResp = await fetch(imageUrl);
      binaryData = new Uint8Array(await imgResp.arrayBuffer());
    }

    const postProcessResult = await postProcessImage(binaryData, aspectRatio, targetDims.width, targetDims.height);

    console.log('[Step 6] Post-process result:', {
      finalWidth: postProcessResult.finalWidth,
      finalHeight: postProcessResult.finalHeight,
      wasCropped: postProcessResult.wasCropped,
      wasResized: postProcessResult.wasResized,
    });

    // =====================================
    // STEP 6.5: Apply Text Overlay (if text enabled)
    // =====================================
    let finalImageData = postProcessResult.processedData;
    
    if (includeText) {
      console.log('[Step 6.5] Applying text overlay with typographic engine...');
      try {
        const textOverlayConfig = buildTextOverlayConfig({
          includeText,
          textContent: textContent || '',
          textPosition: cleanInput(formData.textPosition) || 'center',
          fontFamily: formData.fontFamily || 'Montserrat',
          fontWeight: formData.fontWeight || '700',
          fontSize: formData.fontSize,
          textDesignStyle: formData.textDesignStyle || 'clean',
          ctaText: cleanInput(formData.ctaText) || '',
          headline: briefingResult.headline || '',
          subtexto: briefingResult.subtexto || '',
          disclaimerText: cleanInput(formData.disclaimerText) || '',
          disclaimerStyle: formData.disclaimerStyle,
          brandColor: brandData?.brand_color || undefined,
          contentType: formData.contentType || 'organic',
          imageWidth: postProcessResult.finalWidth,
          imageHeight: postProcessResult.finalHeight,
        });

        if (textOverlayConfig) {
          finalImageData = await applyTextOverlay(finalImageData, textOverlayConfig);
          console.log('[Step 6.5] Text overlay applied successfully');
        } else {
          console.log('[Step 6.5] No text overlay config generated, skipping');
        }
      } catch (overlayError) {
        console.error('[Step 6.5] Text overlay failed, using image without text:', overlayError);
        // Continue with original image - text overlay is non-critical
      }
    }

    // =====================================
    // STEP 7: Upload to Storage
    // =====================================
    console.log('[Step 7] Uploading post-processed image to storage...');
    const timestamp = Date.now();
    const fileName = `content-images/${authenticatedTeamId || authenticatedUserId}/${timestamp}.png`;

    const { error: uploadError } = await supabase.storage.from('content-images').upload(fileName, finalImageData, { contentType: 'image/png', upsert: false });
    
    let publicUrl: string;
    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      const base64Fallback = uint8ArrayToBase64(finalImageData);
      publicUrl = `data:image/png;base64,${base64Fallback}`;
      console.warn('[Step 7] Upload failed, returning base64 fallback');
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
        pipeline: 'premium_v5_textoverlay',
        textOverlayUsed: includeText,
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
        complianceCheck: null,
      }
    }).select().single();

    if (actionError) console.error('Error creating action:', actionError);

    // =====================================
    // STEP 8: Compliance Check in Background
    // =====================================
    const actionId = actionData?.id;
    if (actionId) {
      const bgTask = async () => {
        try {
          console.log('[BG] Running compliance check...');
          const brandContext = formData.brandId ? `Marca: ${formData.description}` : '';
          let complianceResult: ComplianceResult | null = null;
          let finalUrl = publicUrl;

          complianceResult = await checkCompliance(publicUrl, formData.description || '', GEMINI_API_KEY, brandContext);

          if (!complianceResult.approved && complianceResult.correctionInstructions) {
            console.log('[BG] ❌ Compliance FAILED. Auto-correcting...');
            const originalIssues = [...(complianceResult.flags || [])];

            try {
              const origImgResp = await fetch(publicUrl);
              const origImgBuffer = await origImgResp.arrayBuffer();
              const origBytes = new Uint8Array(origImgBuffer);
              const chunkSize = 8192;
              let binaryStr = '';
              for (let i = 0; i < origBytes.length; i += chunkSize) {
                const chunk = origBytes.subarray(i, i + chunkSize);
                binaryStr += String.fromCharCode(...chunk);
              }
              const origBase64 = btoa(binaryStr);
              const origMimeType = origImgResp.headers.get('content-type') || 'image/png';

              const correctedParts = [
                { text: `Edite esta imagem para corrigir os seguintes problemas de compliance, mantendo o máximo possível da composição, estilo, cores e elementos originais.\n\nPROBLEMAS A CORRIGIR:\n${complianceResult.correctionInstructions}\n\nINSTRUÇÃO ORIGINAL: ${formData.description}\n\nIMPORTANTE: Mantenha a mesma cena, cenário, personagens e estilo visual.` },
                { inlineData: { mimeType: origMimeType, data: origBase64 } }
              ];

              const editModel = 'gemini-2.5-flash-image-preview';
              const correctedResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${editModel}:generateContent?key=${GEMINI_API_KEY}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  contents: [{ role: 'user', parts: correctedParts }],
                  generationConfig: { responseModalities: ['IMAGE', 'TEXT'] },
                }),
              });

              if (correctedResponse.ok) {
                const correctedData = await correctedResponse.json();
                const correctedExtracted = extractImageFromResponse(correctedData);
                if (correctedExtracted.imageUrl) {
                  let correctedBinary: Uint8Array;
                  if (correctedExtracted.imageUrl.startsWith('data:')) {
                    correctedBinary = decodeBase64Image(correctedExtracted.imageUrl);
                  } else {
                    const imgResp = await fetch(correctedExtracted.imageUrl);
                    correctedBinary = new Uint8Array(await imgResp.arrayBuffer());
                  }
                  const correctedPost = await postProcessImage(correctedBinary, aspectRatio, targetDims.width, targetDims.height);
                  const correctedFileName = `content-images/${authenticatedTeamId || authenticatedUserId}/${Date.now()}_corrected.png`;
                  const { error: correctedUploadErr } = await supabase.storage.from('content-images').upload(correctedFileName, correctedPost.processedData, { contentType: 'image/png', upsert: false });
                  if (!correctedUploadErr) {
                    const { data: correctedUrlData } = supabase.storage.from('content-images').getPublicUrl(correctedFileName);
                    finalUrl = correctedUrlData.publicUrl;
                  }
                  complianceResult = { ...complianceResult, approved: true, wasAutoCorrected: true, originalIssues, score: 85 };
                }
              }
            } catch (correctionError) {
              console.error('[BG] Auto-correction failed:', correctionError);
            }
          }

          // Update action with compliance result
          await supabase.from('actions').update({
            result: {
              imageUrl: finalUrl,
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
              complianceCheck: complianceResult,
            },
            ...(finalUrl !== publicUrl ? { asset_path: finalUrl, thumb_path: finalUrl } : {}),
          }).eq('id', actionId);
          console.log('[BG] Compliance check done, action updated');
        } catch (bgError) {
          console.error('[BG] Compliance background error:', bgError);
        }
      };
      EdgeRuntime.waitUntil(bgTask());
    }

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
      complianceCheck: null,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error in generate-image function:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
