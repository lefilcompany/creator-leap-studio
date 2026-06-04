import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { z } from "https://esm.sh/zod@3.23.8";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SlideSchema = z.object({
  index: z.number().int().min(0).max(9),
  prompt: z.string().min(1),
  visualStyle: z.string().optional(),
  cameraAngle: z.string().optional(),
  lighting: z.string().optional(),
  composition: z.string().optional(),
  mood: z.string().optional(),
  referenceImageUrl: z.string().url().optional(),
  includeText: z.boolean().optional(),
});

const BodySchema = z.object({
  actionId: z.string().uuid(),
  slidesCount: z.number().int().min(1).max(10),
  slides: z.array(SlideSchema).min(1).max(10),
  brandId: z.string().uuid(),
  themeId: z.string().uuid().optional().nullable(),
  personaId: z.string().uuid().optional().nullable(),
  platform: z.string().default("Carrossel"),
  contentType: z.enum(["organic", "ads"]).default("organic"),
  tone: z.array(z.string()).optional(),
  onlyIndex: z.number().int().min(0).max(9).optional(),
  aspectRatio: z.string().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  // Legacy fallback
  referenceImages: z.array(z.string()).max(5).optional(),
  // Mesmo contrato do generate-image (imagem única)
  preserveImages: z.array(z.string()).max(5).optional(),
  styleReferenceImages: z.array(z.string()).max(5).optional(),
  brandReferenceImages: z.array(z.string()).max(5).optional(),
  userReferenceImages: z.array(z.string()).max(5).optional(),
  preserveImageIndices: z.array(z.number().int().min(0)).optional(),
  // ===== Regeração guiada (requer onlyIndex) =====
  regenerationInstructions: z.string().max(2000).optional(),
  regenerationReferenceImages: z.array(z.string().url()).max(3).optional(),
  avoid: z.string().max(500).optional(),
  keepOriginalPrompt: z.boolean().optional().default(true),
});

type Body = z.infer<typeof BodySchema>;
type Slide = z.infer<typeof SlideSchema>;

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Read-modify-write helper for actions.result.carousel.slides[i]
async function patchSlide(
  adminClient: ReturnType<typeof createClient>,
  actionId: string,
  index: number,
  patch: Record<string, unknown>,
  slidesCount: number,
) {
  // Small retry loop in case of concurrent writes
  for (let attempt = 0; attempt < 3; attempt++) {
    const { data, error } = await adminClient
      .from("actions")
      .select("result")
      .eq("id", actionId)
      .single();
    if (error) {
      console.error("patchSlide read error", error);
      return;
    }
    const current = (data?.result as Record<string, any>) ?? {};
    const carousel = current.carousel ?? { slidesCount, slides: [] };
    const slides = Array.isArray(carousel.slides) ? [...carousel.slides] : [];
    while (slides.length < slidesCount) slides.push({ status: "pending" });
    slides[index] = { ...(slides[index] ?? {}), ...patch };
    const next = { ...current, carousel: { ...carousel, slidesCount, slides } };
    const { error: upErr } = await adminClient
      .from("actions")
      .update({ result: next })
      .eq("id", actionId);
    if (!upErr) return;
    console.warn("patchSlide write retry", attempt, upErr);
  }
}

async function callGenerateImageForSlide(
  authHeader: string,
  body: Body,
  slide: Slide,
): Promise<{ imageUrl?: string; childActionId?: string; error?: string }> {
  try {
    const isRegenForThisSlide =
      typeof body.onlyIndex === "number" &&
      body.onlyIndex === slide.index &&
      !!(body.regenerationInstructions && body.regenerationInstructions.trim());

    // Monta a descrição (prompt) final
    let description = slide.prompt;
    if (isRegenForThisSlide) {
      const keep = body.keepOriginalPrompt !== false;
      const instr = body.regenerationInstructions!.trim();
      if (keep) {
        description = `${slide.prompt}\n\nAJUSTES SOLICITADOS PELO USUÁRIO (prioritários):\n${instr}`;
      } else {
        description = instr;
      }
      if (body.avoid && body.avoid.trim()) {
        description += `\n\nEVITAR ABSOLUTAMENTE: ${body.avoid.trim()}`;
      }
    }

    // Mescla referência específica do slide (se houver) no pool de preserve.
    // Quando há regeração com referências enviadas, elas substituem as refs do slide.
    const slideRef = slide.referenceImageUrl ? [slide.referenceImageUrl] : [];
    const regenRefs = isRegenForThisSlide
      ? (body.regenerationReferenceImages ?? [])
      : [];
    const preserveImagesBase = isRegenForThisSlide && regenRefs.length > 0
      ? regenRefs
      : [...(body.preserveImages ?? []), ...slideRef];
    const preserveImages = preserveImagesBase.slice(0, 5);
    const styleReferenceImages = (body.styleReferenceImages ?? []).slice(0, 5);
    const brandReferenceImages = (body.brandReferenceImages ?? []).slice(0, 3);
    const userReferenceImages = (body.userReferenceImages ?? []).slice(0, 5);
    const preserveImageIndices = body.preserveImageIndices ?? [];

    // Fallback legado: nada marcado explicitamente → usa referenceImages como preserve
    const legacyReferences = body.referenceImages ?? [];
    const finalPreserve =
      preserveImages.length === 0 && styleReferenceImages.length === 0 && legacyReferences.length > 0
        ? legacyReferences.slice(0, 5)
        : preserveImages;

    // Permite controle por slide do texto na imagem.
    // Quando o slide não tem includeText=true e o conteúdo é "ads",
    // forçamos contentType "organic" só para este slide, para que o
    // imagePromptBuilder não injete headline/CTA automáticos do modo anúncio.
    const slideIncludeText = slide.includeText === true;
    const effectiveContentType =
      body.contentType === "ads" && !slideIncludeText ? "organic" : body.contentType;

    const payload: Record<string, unknown> = {
      description,
      brandId: body.brandId,
      themeId: body.themeId ?? undefined,
      personaId: body.personaId ?? undefined,
      platform: "Carrossel",
      contentType: effectiveContentType,
      aspectRatio: body.aspectRatio ?? "4:5",
      width: body.width ?? 1080,
      height: body.height ?? 1350,
      visualStyle: slide.visualStyle ?? "realistic",
      cameraAngle: slide.cameraAngle,
      lighting: slide.lighting,
      composition: slide.composition,
      mood: slide.mood,
      includeText: slideIncludeText,
      tone: body.tone ?? [],
      parentActionId: body.actionId,
      // Mesmo contrato de referências do fluxo de imagem única
      preserveImages: finalPreserve,
      styleReferenceImages,
      brandReferenceImages,
      userReferenceImages,
      preserveImageIndices,
    };

    // Timeout duro para evitar workers presos (ex.: loop de compliance
    // no generate-image bloqueando o pool indefinidamente).
    const SLIDE_TIMEOUT_MS = 4 * 60 * 1000; // 4 min
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SLIDE_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(`${SUPABASE_URL}/functions/v1/generate-image`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: authHeader,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeoutId);
      if ((err as any)?.name === "AbortError") {
        return { error: "Tempo esgotado ao gerar este slide (possível loop de compliance). Tente regerar." };
      }
      return { error: err instanceof Error ? err.message : String(err) };
    }
    clearTimeout(timeoutId);

    const text = await res.text();
    let json: any = {};
    try { json = JSON.parse(text); } catch { /* keep text */ }

    if (!res.ok) {
      const msg = json?.error || text || `HTTP ${res.status}`;
      return { error: typeof msg === "string" ? msg : JSON.stringify(msg) };
    }
    if (!json?.imageUrl) {
      return { error: "Resposta sem imageUrl" };
    }
    return { imageUrl: json.imageUrl, childActionId: json.actionId };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

// Política de custo das regerações de slide:
// - 1ª regeração de um mesmo slide: grátis (refund total dos 8 créditos cobrados por generate-image)
// - Da 2ª em diante: 4 créditos (refund de 4 do total cobrado)
const FULL_IMAGE_COST = 8;
const REGEN_FREE_LIMIT = 1;
const REGEN_PAID_COST = 4;

async function applyRegenerationRefundAndIncrement(
  admin: ReturnType<typeof createClient>,
  userId: string,
  actionId: string,
  slideIndex: number,
  slidesCount: number,
) {
  try {
    // Lê o regenerationCount atual do slide
    const { data: row } = await admin
      .from("actions")
      .select("result, team_id")
      .eq("id", actionId)
      .single();
    const result = (row?.result as any) ?? {};
    const carousel = result.carousel ?? {};
    const slides: any[] = Array.isArray(carousel.slides) ? [...carousel.slides] : [];
    while (slides.length < slidesCount) slides.push({ status: "pending" });
    const currentCount = Number(slides[slideIndex]?.regenerationCount ?? 0);
    const targetCost = currentCount < REGEN_FREE_LIMIT ? 0 : REGEN_PAID_COST;
    const refund = Math.max(0, FULL_IMAGE_COST - targetCost);

    // Aplica refund (se necessário) diretamente em profiles.credits
    if (refund > 0) {
      const { data: prof } = await admin
        .from("profiles")
        .select("credits")
        .eq("id", userId)
        .single();
      const before = Number(prof?.credits ?? 0);
      const after = before + refund;
      await admin.from("profiles").update({ credits: after }).eq("id", userId);
      await admin.from("credit_history").insert({
        user_id: userId,
        team_id: row?.team_id ?? null,
        action_type: "CAROUSEL_SLIDE_REGENERATE_REFUND",
        credits_used: -refund,
        credits_before: before,
        credits_after: after,
        description: `Reembolso parcial de regeração de slide (custo final ${targetCost})`,
        metadata: { actionId, slideIndex, regenerationCount: currentCount + 1, targetCost },
      });
    }

    // Incrementa regenerationCount no slide
    for (let attempt = 0; attempt < 3; attempt++) {
      const { data: cur } = await admin
        .from("actions")
        .select("result")
        .eq("id", actionId)
        .single();
      const curResult = (cur?.result as Record<string, any>) ?? {};
      const car = curResult.carousel ?? { slidesCount, slides: [] };
      const newSlides = Array.isArray(car.slides) ? [...car.slides] : [];
      while (newSlides.length < slidesCount) newSlides.push({ status: "pending" });
      newSlides[slideIndex] = {
        ...(newSlides[slideIndex] ?? {}),
        regenerationCount: currentCount + 1,
      };
      const next = { ...curResult, carousel: { ...car, slidesCount, slides: newSlides } };
      const { error } = await admin.from("actions").update({ result: next }).eq("id", actionId);
      if (!error) break;
    }
  } catch (err) {
    console.error("applyRegenerationRefundAndIncrement error", err);
  }
}

async function generateCarouselCaption(
  admin: ReturnType<typeof createClient>,
  actionId: string,
) {
  try {
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiApiKey) {
      console.warn("[carousel-caption] sem GEMINI_API_KEY");
      return;
    }
    const { data: actionRow } = await admin
      .from("actions")
      .select("result, details")
      .eq("id", actionId)
      .single();
    const result = (actionRow?.result as any) ?? {};
    const details = (actionRow?.details as any) ?? {};
    const carousel = result.carousel ?? {};
    const slides: any[] = Array.isArray(carousel.slides) ? carousel.slides : [];
    const promptsJoined = slides
      .map((s, i) => `Slide ${i + 1}: ${s?.prompt ?? ""}`)
      .filter(Boolean)
      .join("\n");

    const brandName = details.brandName ?? "";
    const personaName = details.personaName ?? "";
    const themeName = details.themeName ?? "";
    const tone = Array.isArray(details.tone) ? details.tone.join(", ") : "";

    const prompt = `Você é um copywriter especialista em carrosséis para Instagram.
Crie UMA legenda única para o carrossel abaixo. Retorne SOMENTE JSON válido no formato:
{"title":"...", "body":"...", "hashtags":["tag1","tag2","tag3","tag4","tag5"]}

Regras:
- title: gancho magnético de 45-60 caracteres
- body: 600-1100 caracteres, com quebras de linha, máximo 5 emojis sutis, com CTA no final
- hashtags: 5 a 8 hashtags estratégicas (sem o caractere #), mix nicho + médio alcance
- Não invente dados; apóie-se nos slides

Contexto da marca: ${brandName}
Persona: ${personaName}
Editoria/Tema: ${themeName}
Tom de voz: ${tone}

Slides do carrossel:
${promptsJoined}`;

    console.log("[carousel-caption] chamando Gemini, prompt chars=", prompt.length);
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      },
    );
    if (!res.ok) {
      console.error("[carousel-caption] gemini err", res.status, await res.text());
      return;
    }
    const json: any = await res.json();
    const finishReason = json?.candidates?.[0]?.finishReason;
    const text = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    console.log("[carousel-caption] finishReason=", finishReason, "textLen=", text.length);
    let caption: any = null;
    try { caption = JSON.parse(text); } catch {
      const m = text.match(/\{[\s\S]*\}/);
      if (m) { try { caption = JSON.parse(m[0]); } catch { /* noop */ } }
    }
    if (!caption?.title || !caption?.body || !Array.isArray(caption?.hashtags)) {
      console.warn("[carousel-caption] resposta inválida finishReason=", finishReason, "text=", text?.slice(0, 500));
      return;
    }
    console.log("[carousel-caption] legenda gerada com sucesso");

    for (let attempt = 0; attempt < 3; attempt++) {
      const { data: cur } = await admin
        .from("actions")
        .select("result")
        .eq("id", actionId)
        .single();
      const curResult = (cur?.result as Record<string, any>) ?? {};
      const car = curResult.carousel ?? {};
      const next = {
        ...curResult,
        title: caption.title || curResult.title || null,
        carousel: {
          ...car,
          caption: { title: caption.title, body: caption.body, hashtags: caption.hashtags },
        },
      };

      const { error } = await admin.from("actions").update({ result: next }).eq("id", actionId);
      if (!error) return;
      console.warn("[carousel-caption] retry update", attempt, error);
    }
  } catch (err) {
    console.error("[carousel-caption] fatal", err);
  }
}

async function processCarousel(authHeader: string, body: Body, userId: string) {
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  const run = async (slide: Slide) => {
    await patchSlide(admin, body.actionId, slide.index, {
      ...slide,
      status: "generating",
      error: null,
    }, body.slidesCount);

    const result = await callGenerateImageForSlide(authHeader, body, slide);

    if (result.error) {
      await patchSlide(admin, body.actionId, slide.index, {
        status: "error",
        error: result.error,
      }, body.slidesCount);
    } else {
      await patchSlide(admin, body.actionId, slide.index, {
        status: "done",
        imageUrl: result.imageUrl,
        childActionId: result.childActionId,
        error: null,
      }, body.slidesCount);

      // Se foi uma regeração guiada deste slide, aplica refund parcial e incrementa contador
      const isRegen =
        typeof body.onlyIndex === "number" &&
        body.onlyIndex === slide.index &&
        !!(body.regenerationInstructions && body.regenerationInstructions.trim());
      if (isRegen) {
        await applyRegenerationRefundAndIncrement(
          admin,
          userId,
          body.actionId,
          slide.index,
          body.slidesCount,
        );
      }

      // Define o thumb_path da action pai com a primeira imagem pronta,
      // para que o carrossel apareça com miniatura no histórico.
      try {
        const { data: parent } = await admin
          .from("actions")
          .select("thumb_path")
          .eq("id", body.actionId)
          .single();
        if (parent && !parent.thumb_path && result.imageUrl) {
          const marker = "/storage/v1/object/public/content-images/";
          const idx = result.imageUrl.indexOf(marker);
          const objectPath = idx >= 0
            ? result.imageUrl.slice(idx + marker.length).split("?")[0]
            : null;
          if (objectPath) {
            await admin
              .from("actions")
              .update({ thumb_path: objectPath, asset_path: objectPath })
              .eq("id", body.actionId);
          }
        }
      } catch (err) {
        console.warn("Failed to set parent thumb_path", err);
      }
    }
  };

  try {
    if (typeof body.onlyIndex === "number") {
      const target = body.slides.find((s) => s.index === body.onlyIndex);
      if (target) await run(target);
      return;
    }

    for (const s of body.slides) {
      await patchSlide(admin, body.actionId, s.index, {
        ...s,
        status: "pending",
        error: null,
      }, body.slidesCount);
    }

    const sorted = [...body.slides].sort((a, b) => a.index - b.index);
    if (sorted.length === 0) return;

    // Pool de concorrência: máximo 3 slides simultâneos para evitar rate limit
    // do Gemini e contenção no patchSlide (read-modify-write em actions.result).
    const CONCURRENCY = 3;
    const queue = [...sorted];
    const workers = Array.from(
      { length: Math.min(CONCURRENCY, queue.length) },
      async () => {
        while (queue.length) {
          const next = queue.shift();
          if (!next) break;
          await run(next);
        }
      },
    );
    await Promise.all(workers);

    // Auto-gera legenda do carrossel — basta ter ao menos 1 slide pronto
    try {
      const { data: finalRow } = await admin
        .from("actions")
        .select("result")
        .eq("id", body.actionId)
        .single();
      const finalCarousel = (finalRow?.result as any)?.carousel;
      const finalSlides: any[] = Array.isArray(finalCarousel?.slides) ? finalCarousel.slides : [];
      const hasAnyDone = finalSlides.some((s) => s?.status === "done" && s?.imageUrl);
      console.log("[carousel-caption] hasAnyDone=", hasAnyDone, "hasCaption=", !!finalCarousel?.caption);
      if (hasAnyDone && !finalCarousel?.caption) {
        await generateCarouselCaption(admin, body.actionId);
      }
    } catch (capErr) {
      console.error("[carousel-caption] erro ao disparar legenda", capErr);
    }
  } catch (err) {
    console.error("processCarousel fatal", err);
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    const rawBody = await req.json().catch(() => null);
    const parsed = BodySchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Input inválido", details: parsed.error.flatten() }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const body = parsed.data;

    // Verifica ownership da action
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data: action, error: actionErr } = await admin
      .from("actions")
      .select("id, user_id")
      .eq("id", body.actionId)
      .single();
    if (actionErr || !action) {
      return new Response(JSON.stringify({ error: "Action não encontrada" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (action.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Background processing
    // @ts-ignore EdgeRuntime is provided by Supabase Edge Runtime
    if (typeof EdgeRuntime !== "undefined" && EdgeRuntime?.waitUntil) {
      // @ts-ignore
      EdgeRuntime.waitUntil(processCarousel(authHeader, body, userId));
    } else {
      // Fallback: fire-and-forget
      processCarousel(authHeader, body, userId).catch((e) => console.error("bg error", e));
    }

    return new Response(
      JSON.stringify({ ok: true, actionId: body.actionId }),
      { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("generate-carousel-images error", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
