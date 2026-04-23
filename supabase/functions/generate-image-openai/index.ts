// Edge function: generate-image-openai
// Substitui o Gemini pela OpenAI GPT Image 2 mantendo todo o pipeline
// (Briefing -> Refiner -> Director -> Compliance) e suportando streaming SSE
// com partial_images para prévia progressiva.

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';
import { getOpenAIImageCost, type OpenAIImageQuality } from '../_shared/creditCosts.ts';
import { checkUserCredits, deductUserCredits, recordUserCreditUsage } from '../_shared/userCredits.ts';
import { expandBriefing } from '../_shared/expandBriefing.ts';
import { postProcessImage, resolveAspectRatio, ASPECT_RATIO_DIMENSIONS, decodeBase64Image } from '../_shared/imagePostProcess.ts';
import { checkCompliance, type ComplianceResult } from '../_shared/complianceCheck.ts';
import { applyTextOverlay } from '../_shared/textOverlay.ts';
import {
  cleanInput,
  normalizeImageArray,
  getStyleSettings,
  isPortraitRequest,
  buildBriefingDocument,
  buildDirectorPrompt,
  fetchApprovedFeedbackImages,
  uint8ArrayToBase64,
} from '../_shared/imagePromptBuilder.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ===== OpenAI GPT Image 2 — Tipos e helpers =====
type OpenAISize =
  | '1024x1024' | '1024x1536' | '1536x1024'
  | '2048x2048' | '2048x1080' | '1080x2048'
  | '3840x2160' | '2160x3840'
  | 'auto';

type OpenAIBackground = 'opaque' | 'auto';
type OpenAIOutputFormat = 'png' | 'jpeg' | 'webp';

interface OpenAIImageRequest {
  prompt: string;
  size?: OpenAISize;
  quality?: OpenAIImageQuality;
  background?: OpenAIBackground;
  output_format?: OpenAIOutputFormat;
  output_compression?: number; // 0-100, apenas jpeg/webp
  n?: number; // 1-10
  partial_images?: number; // 0-3
  stream?: boolean;
}

/**
 * Mapeia aspect ratio (1:1, 16:9, etc.) para size suportado pelo GPT Image 2.
 * O modelo aceita dimensões flexíveis (múltiplas de 16, ratio <= 3:1).
 */
function aspectRatioToOpenAISize(aspectRatio: string): OpenAISize {
  const map: Record<string, OpenAISize> = {
    '1:1': '1024x1024',
    '4:5': '1024x1536',  // próximo de 4:5
    '5:4': '1536x1024',
    '9:16': '1024x1536',
    '16:9': '1536x1024',
    '3:4': '1024x1536',
    '4:3': '1536x1024',
    '2:3': '1024x1536',
    '3:2': '1536x1024',
    '21:9': '1536x1024',
    '1.91:1': '1536x1024',
  };
  return map[aspectRatio] || '1024x1024';
}

/**
 * Chama a API OpenAI GPT Image 2 com suporte a streaming SSE (partial_images)
 * ou modo síncrono (stream: false).
 *
 * Retorna { imageBase64, partialImages } onde:
 * - imageBase64: imagem final em base64 (sempre presente em sucesso)
 * - partialImages: prévias progressivas recebidas durante o streaming (se houver)
 *
 * Quando onPartial é fornecido, é chamado para cada partial_image durante o stream.
 */
async function callOpenAIImage(
  apiKey: string,
  request: OpenAIImageRequest,
  onPartial?: (b64: string, index: number) => void,
): Promise<{ imageBase64: string; partialImages: string[] }> {
  const useStream = request.stream ?? (request.partial_images && request.partial_images > 0);
  // OpenAI exige n=1 quando stream=true. Forçamos para evitar HTTP 400.
  const safeN = useStream ? 1 : (request.n ?? 1);

  const body = {
    model: 'gpt-image-2',
    prompt: request.prompt,
    size: request.size ?? '1024x1024',
    quality: request.quality ?? 'medium',
    background: request.background ?? 'auto',
    output_format: request.output_format ?? 'png',
    ...(request.output_compression !== undefined && { output_compression: request.output_compression }),
    n: safeN,
    ...(useStream && {
      stream: true,
      partial_images: Math.min(Math.max(request.partial_images ?? 1, 0), 3),
    }),
  };

  console.log('[OpenAI] Request:', {
    size: body.size,
    quality: body.quality,
    background: body.background,
    output_format: body.output_format,
    n: body.n,
    stream: useStream,
    partial_images: body.partial_images,
    promptChars: body.prompt.length,
  });

  const response = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('[OpenAI] HTTP', response.status, errText);
    if (response.status === 403 || response.status === 401) {
      throw new Error(`OpenAI ${response.status}: organização não verificada ou API key inválida. Acesse platform.openai.com/settings/organization/general para verificar.`);
    }
    if (response.status === 429) {
      throw new Error('OpenAI 429: limite de requisições excedido. Tente novamente em alguns minutos.');
    }
    throw new Error(`OpenAI ${response.status}: ${errText.slice(0, 500)}`);
  }

  const partialImages: string[] = [];

  // ===== Modo síncrono (sem stream) =====
  if (!useStream) {
    const data = await response.json();
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) throw new Error('OpenAI: resposta sem b64_json');
    return { imageBase64: b64, partialImages };
  }

  // ===== Modo streaming SSE =====
  if (!response.body) throw new Error('OpenAI: stream sem body');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalB64: string | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buffer.indexOf('\n')) !== -1) {
      let line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (!line.startsWith('data: ')) continue;

      const payload = line.slice(6).trim();
      if (payload === '[DONE]') break;

      try {
        const evt = JSON.parse(payload);
        // Eventos esperados: image_generation.partial_image / image_generation.completed
        if (evt.type === 'image_generation.partial_image' && evt.b64_json) {
          partialImages.push(evt.b64_json);
          onPartial?.(evt.b64_json, evt.partial_image_index ?? partialImages.length - 1);
          console.log(`[OpenAI] partial_image #${partialImages.length} (${evt.b64_json.length} chars)`);
        } else if (evt.type === 'image_generation.completed' && evt.b64_json) {
          finalB64 = evt.b64_json;
          console.log('[OpenAI] completed');
        }
      } catch {
        // partial JSON, re-buffer
        buffer = line + '\n' + buffer;
        break;
      }
    }
  }

  if (!finalB64) {
    // Algumas variantes do stream entregam tudo via partial — usa o último frame
    if (partialImages.length > 0) {
      finalB64 = partialImages[partialImages.length - 1];
      console.warn('[OpenAI] no completed event — using last partial as final');
    } else {
      throw new Error('OpenAI stream encerrado sem imagem final');
    }
  }

  return { imageBase64: finalB64, partialImages };
}

/**
 * Chama a API OpenAI GPT Image 2 EDIT endpoint (/v1/images/edits) com suporte a
 * edição com imagem base + máscara opcional. Aceita streaming SSE também.
 *
 * - `baseImages`: 1 ou mais imagens base (data URL ou bytes). A primeira é usada
 *    como referência principal de edição.
 * - `mask`: PNG opcional com canal alpha — pixels transparentes serão regenerados.
 *    Deve ter o MESMO tamanho da primeira imagem base.
 */
async function callOpenAIImageEdit(
  apiKey: string,
  request: OpenAIImageRequest & {
    baseImages: Array<{ bytes: Uint8Array; mime: string; filename: string }>;
    mask?: { bytes: Uint8Array; mime: string; filename: string };
  },
  onPartial?: (b64: string, index: number) => void,
): Promise<{ imageBase64: string; partialImages: string[] }> {
  const useStream = request.stream ?? (request.partial_images && request.partial_images > 0);

  const form = new FormData();
  form.append('model', 'gpt-image-2');
  form.append('prompt', request.prompt);
  form.append('size', request.size ?? '1024x1024');
  form.append('quality', request.quality ?? 'medium');
  form.append('background', request.background ?? 'auto');
  form.append('output_format', request.output_format ?? 'png');
  if (request.output_compression !== undefined) {
    form.append('output_compression', String(request.output_compression));
  }
  form.append('n', String(request.n ?? 1));

  // image[] — múltiplas imagens base permitidas
  for (const img of request.baseImages) {
    form.append('image[]', new Blob([img.bytes], { type: img.mime }), img.filename);
  }

  // mask — opcional, deve ser PNG com transparência (deve ter tamanho idêntico à imagem base)
  if (request.mask) {
    form.append('mask', new Blob([request.mask.bytes], { type: request.mask.mime }), request.mask.filename);
  }

  if (useStream) {
    form.append('stream', 'true');
    form.append('partial_images', String(Math.min(Math.max(request.partial_images ?? 1, 0), 3)));
  }

  console.log('[OpenAI Edit] Request:', {
    size: request.size ?? '1024x1024',
    quality: request.quality ?? 'medium',
    baseImagesCount: request.baseImages.length,
    hasMask: !!request.mask,
    stream: useStream,
    promptChars: request.prompt.length,
  });

  const response = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}` },
    body: form,
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('[OpenAI Edit] HTTP', response.status, errText);
    if (response.status === 403 || response.status === 401) {
      throw new Error(`OpenAI ${response.status}: organização não verificada ou API key inválida.`);
    }
    if (response.status === 429) {
      throw new Error('OpenAI 429: limite de requisições excedido.');
    }
    throw new Error(`OpenAI Edit ${response.status}: ${errText.slice(0, 500)}`);
  }

  const partialImages: string[] = [];

  if (!useStream) {
    const data = await response.json();
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) throw new Error('OpenAI Edit: resposta sem b64_json');
    return { imageBase64: b64, partialImages };
  }

  // ===== Streaming SSE =====
  if (!response.body) throw new Error('OpenAI Edit: stream sem body');
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let finalB64: string | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let idx: number;
    while ((idx = buffer.indexOf('\n')) !== -1) {
      let line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);
      if (line.endsWith('\r')) line = line.slice(0, -1);
      if (!line.startsWith('data: ')) continue;

      const payload = line.slice(6).trim();
      if (payload === '[DONE]') break;

      try {
        const evt = JSON.parse(payload);
        const isPartial = evt.type === 'image_edit.partial_image' || evt.type === 'image_generation.partial_image';
        const isCompleted = evt.type === 'image_edit.completed' || evt.type === 'image_generation.completed';
        if (isPartial && evt.b64_json) {
          partialImages.push(evt.b64_json);
          onPartial?.(evt.b64_json, evt.partial_image_index ?? partialImages.length - 1);
        } else if (isCompleted && evt.b64_json) {
          finalB64 = evt.b64_json;
        }
      } catch {
        buffer = line + '\n' + buffer;
        break;
      }
    }
  }

  if (!finalB64) {
    if (partialImages.length > 0) finalB64 = partialImages[partialImages.length - 1];
    else throw new Error('OpenAI Edit stream encerrado sem imagem final');
  }

  return { imageBase64: finalB64, partialImages };
}

/** Converte data URL ou URL pública em { bytes, mime } */
async function toBytesWithMime(input: string, fallbackMime = 'image/png'): Promise<{ bytes: Uint8Array; mime: string }> {
  if (input.startsWith('data:')) {
    const match = input.match(/^data:([^;]+);base64,(.+)$/);
    const mime = match?.[1] || fallbackMime;
    return { bytes: decodeBase64Image(input), mime };
  }
  const r = await fetch(input);
  const ct = r.headers.get('content-type') || fallbackMime;
  return { bytes: new Uint8Array(await r.arrayBuffer()), mime: ct };
}

/** Converte data URL ou URL pública em Uint8Array */
async function toBytes(input: string): Promise<Uint8Array> {
  if (input.startsWith('data:')) return decodeBase64Image(input);
  const r = await fetch(input);
  return new Uint8Array(await r.arrayBuffer());
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // O cliente pode pedir SSE via header Accept: text/event-stream
  const wantsSSE = req.headers.get('accept')?.includes('text/event-stream') ?? false;

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ===== Auth =====
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    const authenticatedUserId = user.id;

    const { data: profile } = await supabase.from('profiles').select('team_id, credits').eq('id', authenticatedUserId).single();
    const authenticatedTeamId = profile?.team_id || null;

    const formData = await req.json();
    if (!formData.description || typeof formData.description !== 'string') {
      return new Response(JSON.stringify({ error: 'Descrição inválida' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ===== Parâmetros OpenAI específicos =====
    const openaiQuality: OpenAIImageQuality = (formData.openaiQuality as OpenAIImageQuality) || 'medium';
    const openaiBackground: OpenAIBackground = formData.openaiBackground === 'opaque' ? 'opaque' : 'auto';
    const openaiOutputFormat: OpenAIOutputFormat = ['png', 'jpeg', 'webp'].includes(formData.openaiOutputFormat) ? formData.openaiOutputFormat : 'png';
    const openaiCompression: number | undefined = (openaiOutputFormat === 'jpeg' || openaiOutputFormat === 'webp')
      ? Math.min(100, Math.max(0, Number(formData.openaiCompression ?? 75)))
      : undefined;
    const openaiN: number = Math.min(10, Math.max(1, Number(formData.openaiN ?? 1)));
    const openaiPartialImages: number = Math.min(3, Math.max(0, Number(formData.openaiPartialImages ?? (wantsSSE ? 2 : 0))));

    const requiredCredits = getOpenAIImageCost(openaiQuality);

    console.log('[generate-image-openai] Start:', {
      userId: authenticatedUserId,
      quality: openaiQuality,
      cost: requiredCredits,
      sse: wantsSSE,
      partialImages: openaiPartialImages,
    });

    // ===== Verificar créditos =====
    const creditsCheck = await checkUserCredits(supabase, authenticatedUserId, requiredCredits);
    if (!creditsCheck.hasCredits) {
      return new Response(
        JSON.stringify({ error: `Créditos insuficientes. Necessário: ${requiredCredits} créditos` }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const creditsBefore = creditsCheck.currentCredits;

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) throw new Error('OPENAI_API_KEY não configurada');
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY'); // ainda usado para Refiner + Compliance

    // ===== STEP 1: Buscar dados em paralelo =====
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
    const feedbackBase64Images = await fetchApprovedFeedbackImages(supabaseUrl, approvedFeedbackImages, '[Step 1]');

    // ===== STEP 2: Briefing + Refiner =====
    const briefingDocument = buildBriefingDocument(formData, brandData, themeData, personaData, stylePrefs);
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

    // ===== STEP 3: Master Prompt =====
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
        ? formData.preserveImageIndices.filter((idx: unknown): idx is number => Number.isInteger(idx) && Number(idx) >= 0 && Number(idx) < userReferenceImages.length)
        : []
    );
    const explicitUserPreserveImages = userReferenceImages.filter((_, idx) => preserveIndexSet.has(idx));
    const explicitUserStyleImages = userReferenceImages.filter((_, idx) => !preserveIndexSet.has(idx));
    const legacyPreserveImages = normalizeImageArray(formData.preserveImages, 5);
    const mergedPreservePool = [...new Set([...brandReferenceImages, ...legacyPreserveImages, ...explicitUserPreserveImages])];
    const preserveImages = mergedPreservePool.slice(0, 3);
    const remainingSlots = Math.max(0, 5 - preserveImages.length);
    const mergedStylePool = [...new Set([...explicitUserStyleImages, ...normalizeImageArray(formData.styleReferenceImages, 5)])]
      .filter((img) => !preserveImages.includes(img));
    const styleReferenceImages = mergedStylePool.slice(0, remainingSlots);

    const masterPrompt = buildDirectorPrompt({
      originalDescription: description,
      enrichedDescription,
      brandData, themeData, personaData,
      platform: cleanInput(formData.platform),
      contentType: formData.contentType || 'organic',
      objective: cleanInput(formData.objective || formData.description),
      tones, visualStyle,
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
    });

    const userNegativePrompt = cleanInput(formData.negativePrompt);
    const negativeComponents = [styleSettings.negativePrompt];
    if (userNegativePrompt) negativeComponents.push(userNegativePrompt);
    if (!includeText) negativeComponents.push('text, watermark, typography, letters, signature, words, labels');
    const finalNegativePrompt = negativeComponents.filter(Boolean).join(', ');

    const resolved = resolveAspectRatio({
      aspectRatio: formData.aspectRatio,
      width: formData.width,
      height: formData.height,
      platform: cleanInput(formData.platform),
    });
    const aspectRatio = resolved.aspectRatio;
    const aspectRatioSource = resolved.source;
    const targetDims = ASPECT_RATIO_DIMENSIONS[aspectRatio] || ASPECT_RATIO_DIMENSIONS['1:1'];
    const openaiSize: OpenAISize = (formData.openaiSize as OpenAISize) || aspectRatioToOpenAISize(aspectRatio);

    const dimensionPrefix = `IMPORTANT: Image must be generated at exactly ${aspectRatio} aspect ratio (${targetDims.width}x${targetDims.height}px equivalent).\n\n`;
    const finalPrompt = `${dimensionPrefix}${masterPrompt}\n\n[AVOID] ${finalNegativePrompt}`;

    console.log('[Step 3] Final prompt:', finalPrompt.length, 'chars | aspect:', aspectRatio, '-> size:', openaiSize);

    // ===== STEP 4: Setup SSE writer (se cliente pediu) =====
    const encoder = new TextEncoder();
    let sseController: ReadableStreamDefaultController<Uint8Array> | null = null;
    const sseStream = wantsSSE
      ? new ReadableStream<Uint8Array>({ start(controller) { sseController = controller; } })
      : null;

    const sseSend = (event: string, data: any) => {
      if (!sseController) return;
      try {
        sseController.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      } catch (e) {
        console.error('[SSE] enqueue failed:', e);
      }
    };

    // ===== Detecção de modo EDIÇÃO (/v1/images/edits) =====
    // Ativado quando há `openaiEditMode: true` E ao menos uma imagem base
    // (campo `editBaseImages: string[]` com URLs/data-URLs). Máscara opcional via `editMask`.
    const editMode: boolean = formData.openaiEditMode === true
      && Array.isArray(formData.editBaseImages)
      && formData.editBaseImages.length > 0;

    // Função principal que executa a geração e (opcionalmente) emite SSE
    const runGeneration = async () => {
      try {
        sseSend('progress', {
          stage: 'starting',
          message: editMode
            ? 'Preparando edição com OpenAI GPT Image 2...'
            : 'Preparando geração com OpenAI GPT Image 2...',
        });

        // ===== STEP 5: Chamar OpenAI (gerar OU editar) =====
        sseSend('progress', {
          stage: 'generating',
          message: editMode ? 'Editando imagem com IA...' : 'Gerando imagem...',
        });

        let imageBase64: string;
        let partialImages: string[];

        if (editMode) {
          // Carrega imagens base + máscara opcional
          const baseImagesRaw: string[] = (formData.editBaseImages as string[]).slice(0, 4);
          const baseImages = await Promise.all(
            baseImagesRaw.map(async (src, i) => {
              const { bytes, mime } = await toBytesWithMime(src);
              const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
              return { bytes, mime, filename: `base_${i}.${ext}` };
            })
          );

          let mask: { bytes: Uint8Array; mime: string; filename: string } | undefined;
          if (typeof formData.editMask === 'string' && formData.editMask.length > 0) {
            const { bytes } = await toBytesWithMime(formData.editMask, 'image/png');
            // OpenAI exige máscara em PNG
            mask = { bytes, mime: 'image/png', filename: 'mask.png' };
          }

          const result = await callOpenAIImageEdit(
            OPENAI_API_KEY,
            {
              prompt: finalPrompt,
              size: openaiSize,
              quality: openaiQuality,
              background: openaiBackground,
              output_format: openaiOutputFormat,
              output_compression: openaiCompression,
              n: openaiN,
              partial_images: openaiPartialImages,
              stream: wantsSSE && openaiPartialImages > 0,
              baseImages,
              mask,
            },
            (b64, idx) => {
              sseSend('partial_image', { index: idx, b64: `data:image/${openaiOutputFormat};base64,${b64}` });
            }
          );
          imageBase64 = result.imageBase64;
          partialImages = result.partialImages;
        } else {
          const result = await callOpenAIImage(
            OPENAI_API_KEY,
            {
              prompt: finalPrompt,
              size: openaiSize,
              quality: openaiQuality,
              background: openaiBackground,
              output_format: openaiOutputFormat,
              output_compression: openaiCompression,
              n: openaiN,
              partial_images: openaiPartialImages,
              stream: wantsSSE && openaiPartialImages > 0,
            },
            (b64, idx) => {
              sseSend('partial_image', { index: idx, b64: `data:image/${openaiOutputFormat};base64,${b64}` });
            }
          );
          imageBase64 = result.imageBase64;
          partialImages = result.partialImages;
        }


        sseSend('progress', { stage: 'post_processing', message: 'Pós-processando imagem...' });

        // ===== STEP 6: Post-process =====
        const binaryData = decodeBase64Image(`data:image/${openaiOutputFormat};base64,${imageBase64}`);
        const postProcessResult = await postProcessImage(binaryData, aspectRatio, targetDims.width, targetDims.height);
        let finalImageData = postProcessResult.processedData;

        // ===== STEP 6.5: Text Overlay =====
        if (includeText && (briefingResult.headline || briefingResult.subtexto || formData.ctaText)) {
          try {
            const overlayResult = await applyTextOverlay(finalImageData, {
              headline: briefingResult.headline,
              subtexto: briefingResult.subtexto,
              ctaText: cleanInput(formData.ctaText) || '',
              disclaimerText: cleanInput(formData.disclaimerText) || '',
              disclaimerStyle: formData.disclaimerStyle || 'bottom_horizontal',
              textPosition: cleanInput(formData.textPosition) || 'top',
              fontFamily: formData.fontFamily || 'Montserrat',
              fontWeight: formData.fontWeight || 'bold',
              fontItalic: formData.fontItalic || false,
              fontSize: formData.fontSize,
              textDesignStyle: formData.textDesignStyle || 'clean',
              brandColor: brandData?.brand_color || '#FFFFFF',
              imageWidth: postProcessResult.finalWidth,
              imageHeight: postProcessResult.finalHeight,
            });
            if (overlayResult.elementsApplied > 0) finalImageData = overlayResult.processedData;
          } catch (e) {
            console.error('[Step 6.5] overlay error:', e);
          }
        }

        // ===== STEP 7: Upload =====
        sseSend('progress', { stage: 'uploading', message: 'Salvando imagem...' });
        const timestamp = Date.now();
        const fileName = `content-images/${authenticatedTeamId || authenticatedUserId}/${timestamp}.png`;
        const { error: uploadError } = await supabase.storage.from('content-images').upload(fileName, finalImageData, { contentType: 'image/png', upsert: false });
        let publicUrl: string;
        if (uploadError) {
          publicUrl = `data:image/png;base64,${uint8ArrayToBase64(finalImageData)}`;
        } else {
          publicUrl = supabase.storage.from('content-images').getPublicUrl(fileName).data.publicUrl;
        }

        // ===== STEP 8: Compliance =====
        sseSend('progress', { stage: 'compliance', message: 'Verificando conformidade...' });
        let complianceResult: ComplianceResult | null = null;
        let finalPublicUrl = publicUrl;
        if (GEMINI_API_KEY) {
          try {
            const brandContext = formData.brandId ? `Marca: ${formData.description}` : '';
            complianceResult = await checkCompliance(publicUrl, formData.description || '', GEMINI_API_KEY, brandContext);
          } catch (e) {
            console.error('[Step 8] compliance error:', e);
          }
        }

        // ===== Deduzir créditos =====
        const deductResult = await deductUserCredits(supabase, authenticatedUserId, requiredCredits);
        const creditsAfter = deductResult.newCredits;
        await recordUserCreditUsage(supabase, {
          userId: authenticatedUserId,
          teamId: authenticatedTeamId,
          actionType: 'COMPLETE_IMAGE',
          creditsUsed: requiredCredits,
          creditsBefore,
          creditsAfter,
          description: `Geração de imagem (OpenAI GPT Image 2 - ${openaiQuality})`,
          metadata: {
            provider: 'openai',
            model: 'gpt-image-2',
            quality: openaiQuality,
            size: openaiSize,
            output_format: openaiOutputFormat,
            n: openaiN,
            partial_images: openaiPartialImages,
            platform: formData.platform,
            visualStyle,
          },
        });

        // ===== Salvar histórico =====
        const { data: actionData } = await supabase.from('actions').insert({
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
            pipeline: 'openai_gpt_image_2_v1',
            requestedAspectRatio: aspectRatio,
            aspectRatioSource,
            openaiQuality,
            openaiSize,
            openaiOutputFormat,
            openaiBackground,
            openaiEditMode: editMode,
            openaiEditBaseImagesCount: editMode ? (formData.editBaseImages?.length || 0) : 0,
            openaiEditHasMask: editMode && !!formData.editMask,
          },
          result: {
            imageUrl: finalPublicUrl,
            description: 'Imagem gerada com OpenAI GPT Image 2',
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
          }
        }).select().single();

        const finalPayload = {
          imageUrl: finalPublicUrl,
          description: 'Imagem gerada com OpenAI GPT Image 2',
          headline: briefingResult.headline || null,
          subtexto: briefingResult.subtexto || null,
          legenda: briefingResult.legenda || null,
          actionId: actionData?.id,
          success: true,
          finalWidth: postProcessResult.finalWidth,
          finalHeight: postProcessResult.finalHeight,
          finalAspectRatio: postProcessResult.finalAspectRatio,
          requestedAspectRatio: postProcessResult.requestedAspectRatio,
          complianceCheck: complianceResult,
          partialImagesCount: partialImages.length,
          provider: 'openai',
          model: 'gpt-image-2',
          quality: openaiQuality,
          creditsUsed: requiredCredits,
        };

        sseSend('complete', finalPayload);
        return finalPayload;
      } catch (err) {
        console.error('[generate-image-openai] error:', err);
        const msg = err instanceof Error ? err.message : 'Erro desconhecido';
        sseSend('error', { error: msg });
        throw err;
      } finally {
        try { sseController?.close(); } catch { /* ignore */ }
      }
    };

    if (wantsSSE && sseStream) {
      // Inicia geração em background e retorna o stream imediatamente
      runGeneration().catch((e) => console.error('[bg] generation failed:', e));
      return new Response(sseStream, {
        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
      });
    }

    // Modo síncrono — aguarda e retorna JSON
    const payload = await runGeneration();
    return new Response(JSON.stringify(payload), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (error) {
    console.error('Error in generate-image-openai:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
