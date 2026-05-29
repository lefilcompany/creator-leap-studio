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
    const payload: Record<string, unknown> = {
      description: slide.prompt,
      brandId: body.brandId,
      themeId: body.themeId ?? undefined,
      personaId: body.personaId ?? undefined,
      platform: "Carrossel",
      contentType: body.contentType,
      aspectRatio: "4:5",
      width: 1080,
      height: 1350,
      visualStyle: slide.visualStyle ?? "realistic",
      cameraAngle: slide.cameraAngle,
      lighting: slide.lighting,
      composition: slide.composition,
      mood: slide.mood,
      includeText: false,
      tone: body.tone ?? [],
      parentActionId: body.actionId,
      referenceImages: slide.referenceImageUrl ? [slide.referenceImageUrl] : undefined,
    };

    const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-image`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify(payload),
    });

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

async function processCarousel(authHeader: string, body: Body) {
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
    }
  };

  try {
    if (typeof body.onlyIndex === "number") {
      const target = body.slides.find((s) => s.index === body.onlyIndex);
      if (target) await run(target);
      return;
    }

    // Initialize all slides as pending in one shot (preserve any prior state for missing fields)
    for (const s of body.slides) {
      await patchSlide(admin, body.actionId, s.index, {
        ...s,
        status: "pending",
        error: null,
      }, body.slidesCount);
    }

    const sorted = [...body.slides].sort((a, b) => a.index - b.index);
    if (sorted.length === 0) return;

    // Slide 0 sequencial primeiro
    await run(sorted[0]);
    // 1..N-1 em paralelo
    const rest = sorted.slice(1);
    if (rest.length > 0) {
      await Promise.all(rest.map(run));
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
      EdgeRuntime.waitUntil(processCarousel(authHeader, body));
    } else {
      // Fallback: fire-and-forget
      processCarousel(authHeader, body).catch((e) => console.error("bg error", e));
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
