// Edge function: generate-carousel-images
// Orquestra a geração de TODAS as imagens de um carrossel a partir do
// metadata.carousel.slides salvo na pauta.
//
// Estratégia:
//   1. Gera o slide 1 (capa) primeiro, sozinho — vira a referência visual
//   2. Dispara slides 2..N em paralelo, passando a URL da capa como
//      reference_image (image-to-image leve via Gemini)
//   3. Cada chamada usa internamente a edge function generate-image,
//      preservando todo o pipeline de compliance/storage/actions.
//   4. Atualiza metadata.carousel.slides[i] em tempo real para o cliente
//      poder fazer polling.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SlideRow {
  index: number;
  role: string;
  headline: string;
  caption_part: string;
  image_briefing: string;
  design_action_id: string | null;
  image_url: string | null;
  status: "pending" | "generating" | "done" | "error";
  error: string | null;
}

interface RequestBody {
  item_id: string;
  // Quais slides processar; default = todos com status != "done"
  slide_indices?: number[];
  // Force regerar mesmo os "done"
  regenerate?: boolean;
}

const FORMAT_TO_ASPECT: Record<string, string> = {
  carrossel: "4:5",
  post: "1:1",
  reels: "9:16",
  story: "9:16",
  video_longo: "16:9",
};

function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
}

async function loadContext(itemId: string) {
  const sb = adminClient();
  const { data: item, error } = await sb
    .from("calendar_items")
    .select("*")
    .eq("id", itemId)
    .maybeSingle();
  if (error || !item) throw new Error("Pauta não encontrada");
  const { data: cal } = await sb
    .from("content_calendars")
    .select("brand_id, persona_id, theme_id, name")
    .eq("id", item.calendar_id)
    .maybeSingle();
  return { item, cal };
}

async function patchSlide(
  itemId: string,
  index: number,
  patch: Partial<SlideRow>,
) {
  const sb = adminClient();
  const { data: cur } = await sb
    .from("calendar_items")
    .select("metadata")
    .eq("id", itemId)
    .maybeSingle();
  const meta = ((cur?.metadata as any) || {}) as Record<string, any>;
  const slides: SlideRow[] = Array.isArray(meta?.carousel?.slides)
    ? meta.carousel.slides
    : [];
  const i = slides.findIndex((s) => s.index === index);
  if (i === -1) return;
  slides[i] = { ...slides[i], ...patch };
  meta.carousel = { ...(meta.carousel || {}), slides };
  await sb.from("calendar_items").update({ metadata: meta }).eq("id", itemId);
}

async function setOverallStatus(
  itemId: string,
  status: "pending" | "done" | "error",
  extra: Record<string, any> = {},
) {
  const sb = adminClient();
  const { data: cur } = await sb
    .from("calendar_items")
    .select("metadata")
    .eq("id", itemId)
    .maybeSingle();
  const meta = ((cur?.metadata as any) || {}) as Record<string, any>;
  meta.carousel = {
    ...(meta.carousel || {}),
    generation: {
      status,
      updated_at: new Date().toISOString(),
      ...extra,
    },
  };
  await sb.from("calendar_items").update({ metadata: meta }).eq("id", itemId);
}

async function generateOneSlide(
  authToken: string,
  payload: {
    item: any;
    cal: any;
    slide: SlideRow;
    sharedStyle: any;
    referenceImageUrl: string | null;
  },
): Promise<{ imageUrl: string; actionId: string }> {
  const { item, cal, slide, sharedStyle, referenceImageUrl } = payload;
  const meta = (item.metadata || {}) as Record<string, any>;
  const format = meta.format || "carrossel";
  const aspectRatio = FORMAT_TO_ASPECT[format] || "4:5";

  const sharedBlock = sharedStyle
    ? `\n\n[ESTILO COMPARTILHADO DO CARROSSEL — APLIQUE EM TODOS OS SLIDES]\nPaleta: ${sharedStyle.palette || "—"}\nTipografia: ${sharedStyle.typography || "—"}\nMood: ${sharedStyle.mood || "—"}`
    : "";

  const referenceNote = referenceImageUrl
    ? `\n\n[REFERÊNCIA VISUAL — SLIDE 1 DO CARROSSEL]\nUma imagem de referência foi anexada com o estilo, paleta, tipografia e ambientação que TODOS os slides devem seguir. Mantenha a mesma estética visual; mude APENAS a cena/elementos conforme o briefing deste slide. Não copie o sujeito principal — apenas mantenha coerência estética.`
    : "";

  const description =
    `Slide ${slide.index} (${slide.role}) — ${slide.headline}\n\n${slide.image_briefing}${sharedBlock}${referenceNote}`.trim();

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const body: any = {
    description,
    brandId: cal?.brand_id || undefined,
    themeId: cal?.theme_id || undefined,
    personaId: cal?.persona_id || undefined,
    aspectRatio,
    contentType: "organic",
    visualStyle: sharedStyle?.visual_style || "realistic",
    composition: "auto",
    lighting: "natural",
    cameraAngle: "eye_level",
    mood: sharedStyle?.mood || "auto",
    platform: meta.platform || undefined,
  };
  if (referenceImageUrl) {
    body.styleReferenceImages = [referenceImageUrl];
  }

  const resp = await fetch(`${supabaseUrl}/functions/v1/generate-image`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`generate-image falhou (${resp.status}): ${txt.slice(0, 200)}`);
  }
  const data = await resp.json();
  if (!data?.imageUrl) throw new Error("generate-image não retornou imageUrl");
  return { imageUrl: data.imageUrl, actionId: data.actionId };
}

async function runCarousel(
  itemId: string,
  authToken: string,
  options: { regenerate?: boolean; slideIndices?: number[] },
) {
  try {
    await setOverallStatus(itemId, "pending");
    const { item, cal } = await loadContext(itemId);
    const meta = (item.metadata || {}) as Record<string, any>;
    const carousel = meta.carousel || {};
    const allSlides: SlideRow[] = Array.isArray(carousel.slides) ? carousel.slides : [];
    if (allSlides.length === 0) throw new Error("Nenhum slide definido no metadata.carousel");
    const sharedStyle = carousel.shared_style || null;

    // Determina quais slides processar
    const targetIndices = options.slideIndices && options.slideIndices.length > 0
      ? options.slideIndices
      : allSlides
          .filter((s) => options.regenerate || s.status !== "done")
          .map((s) => s.index);

    const includeCover = targetIndices.includes(1);

    // Marca todos os alvos como "generating"
    for (const idx of targetIndices) {
      await patchSlide(itemId, idx, { status: "generating", error: null });
    }

    let referenceImageUrl: string | null = null;
    let coverActionId: string | null = null;

    // 1) Se a capa está nos alvos, gera primeiro (sequencial) para virar referência
    if (includeCover) {
      const cover = allSlides.find((s) => s.index === 1)!;
      try {
        const res = await generateOneSlide(authToken, {
          item,
          cal,
          slide: cover,
          sharedStyle,
          referenceImageUrl: null,
        });
        await patchSlide(itemId, 1, {
          status: "done",
          image_url: res.imageUrl,
          design_action_id: res.actionId,
        });
        referenceImageUrl = res.imageUrl;
        coverActionId = res.actionId;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        await patchSlide(itemId, 1, { status: "error", error: msg });
      }
    } else {
      // Reusa capa existente como referência
      const existingCover = allSlides.find((s) => s.index === 1);
      if (existingCover?.image_url) referenceImageUrl = existingCover.image_url;
      if (existingCover?.design_action_id) coverActionId = existingCover.design_action_id;
    }

    // 2) Demais slides em paralelo
    const otherTargets = targetIndices.filter((i) => i !== 1);
    if (otherTargets.length > 0) {
      // Recarrega slides para ter dados frescos
      const { item: freshItem } = await loadContext(itemId);
      const freshSlides: SlideRow[] = (freshItem.metadata as any)?.carousel?.slides || [];

      await Promise.all(
        otherTargets.map(async (idx) => {
          const slide = freshSlides.find((s) => s.index === idx);
          if (!slide) return;
          try {
            const res = await generateOneSlide(authToken, {
              item: freshItem,
              cal,
              slide,
              sharedStyle,
              referenceImageUrl,
            });
            await patchSlide(itemId, idx, {
              status: "done",
              image_url: res.imageUrl,
              design_action_id: res.actionId,
            });
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            await patchSlide(itemId, idx, { status: "error", error: msg });
          }
        }),
      );
    }

    // 3) Atualiza design_action_id raiz com a capa (se gerada)
    if (coverActionId) {
      const sb = adminClient();
      await sb
        .from("calendar_items")
        .update({ design_action_id: coverActionId })
        .eq("id", itemId);
    }

    await setOverallStatus(itemId, "done");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("runCarousel error:", msg);
    await setOverallStatus(itemId, "error", { error: msg });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Valida usuário
    const sb = adminClient();
    const { data: { user }, error } = await sb.auth.getUser(token);
    if (error || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as RequestBody;
    if (!body.item_id) {
      return new Response(JSON.stringify({ error: "item_id obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Marca pendente imediatamente para a UI já refletir
    await setOverallStatus(body.item_id, "pending");

    // @ts-ignore EdgeRuntime
    EdgeRuntime.waitUntil(
      runCarousel(body.item_id, token, {
        regenerate: body.regenerate === true,
        slideIndices: body.slide_indices,
      }),
    );

    return new Response(
      JSON.stringify({ accepted: true, mode: "background" }),
      { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    console.error("generate-carousel-images error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
