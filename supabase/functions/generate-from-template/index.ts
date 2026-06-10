import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { CREDIT_COSTS } from "../_shared/creditCosts.ts";
import {
  isUuid,
  TEMPLATE_BUCKET,
  type FontAssets,
  type LogoSlot,
  type TextZone,
} from "../_shared/templates.ts";
import { composeTemplate } from "../_shared/templateCanvas.ts";
import { generateBackground } from "../_shared/templateBackground.ts";
import {
  cacheKey,
  FONT_BUCKET,
  googleFontsCssUrl,
  pickFontUrlFromCss,
  resolveFont,
  type FontFetchers,
} from "../_shared/templateFontCache.ts";
import { checkCompliance } from "../_shared/complianceCheck.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (s: number, b: unknown) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const COST = CREDIT_COSTS.TEMPLATE_IMAGE; // 4
const mem = new Map<string, Uint8Array>();

interface FillInput {
  zone_id: string;
  value: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return json(401, { error: "Unauthorized" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const geminiKey = Deno.env.get("GEMINI_API_KEY");

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const admin = createClient(supabaseUrl, serviceKey);

  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) return json(401, { error: "Unauthorized" });
  const user = userData.user;

  let body: any;
  try { body = await req.json(); } catch { return json(400, { error: "Invalid JSON" }); }

  if (!isUuid(body.template_id)) return json(400, { error: "template_id inválido" });
  const fills: FillInput[] = Array.isArray(body.fills) ? body.fills : [];
  const backgroundMode: "reuse" | "new" =
    body.background_mode === "new" ? "new" : "reuse";
  const backgroundPrompt: string | undefined = body.background_prompt;
  if (backgroundMode === "new" && (!backgroundPrompt || backgroundPrompt.trim().length < 3)) {
    return json(400, { error: "background_prompt obrigatório quando background_mode='new'" });
  }

  const { data: tpl, error: tplErr } = await userClient
    .from("brand_templates")
    .select("id, brand_id, workspace_id, status, preview_path, clean_background_path, width, height, text_zones, logo_slot, font_assets")
    .eq("id", body.template_id)
    .is("deleted_at", null)
    .maybeSingle();
  if (tplErr) return json(500, { error: tplErr.message });
  if (!tpl) return json(404, { error: "Template não encontrado" });
  if (tpl.status !== "ready")
    return json(422, { error: "Template não está pronto", status: tpl.status });

  const textZones: TextZone[] = tpl.text_zones ?? [];
  const logoSlot: LogoSlot | null = tpl.logo_slot ?? null;
  const fontAssets: FontAssets = tpl.font_assets ?? {};

  // Resolve valores por zona.
  const zoneValues: Array<TextZone & { value: string }> = textZones.map((z) => {
    const f = fills.find((x) => x.zone_id === z.id);
    return { ...z, value: f?.value ?? z.original_text ?? "" };
  });

  // Compliance roda APÓS composição (precisa da imagem final), mas ANTES do débito.
  // Validação simples de tamanho/charset acontece aqui.
  for (const z of zoneValues) {
    if (z.value.length > 500) {
      return json(422, { error: `Zona "${z.label}" excede 500 caracteres` });
    }
  }

  // ===== Resolve fundo =====
  let backgroundBytes: Uint8Array;
  let aiCallsForBackground = 0;
  if (backgroundMode === "reuse") {
    if (!tpl.clean_background_path) {
      return json(422, { error: "Template sem clean_background; use background_mode='new'" });
    }
    const { data: blob, error } = await admin.storage
      .from(TEMPLATE_BUCKET)
      .download(tpl.clean_background_path);
    if (error || !blob) return json(500, { error: "Falha lendo fundo limpo" });
    backgroundBytes = new Uint8Array(await blob.arrayBuffer());
  } else {
    if (!geminiKey) return json(500, { error: "GEMINI_API_KEY ausente" });
    try {
      const aspect = `${tpl.width}:${tpl.height}`;
      const img = await generateBackground(geminiKey, backgroundPrompt!, aspect, []);
      backgroundBytes = Uint8Array.from(atob(img.base64), (c) => c.charCodeAt(0));
      aiCallsForBackground = 1;
    } catch (err: any) {
      return json(502, { error: "Falha gerando fundo", detail: String(err?.message ?? err) });
    }
  }

  // ===== Resolve fontes =====
  const fontBytes = new Map<string, Uint8Array>();
  const fetchers = buildFontFetchers(admin);
  for (const [family, asset] of Object.entries(fontAssets)) {
    try {
      const weight = (asset as any).weights?.[0] ?? 400;
      const bytes = await resolveFont(
        asset.source === "google"
          ? { family, weight, source: "google" }
          : { family, weight, source: "custom", fontId: (asset as any).font_id },
        fetchers,
      );
      fontBytes.set(`${family}|${weight}`, bytes);
    } catch (err) {
      console.error("Font resolve falhou:", family, err);
    }
  }

  // ===== Composição =====
  let finalPng: Uint8Array;
  try {
    finalPng = await composeTemplate({
      background: backgroundBytes,
      width: tpl.width,
      height: tpl.height,
      zones: zoneValues,
      logoSlot,
      logoBytes: await loadBrandLogo(admin, tpl.brand_id),
      fontBytes,
    });
  } catch (err: any) {
    return json(422, { error: "Falha na composição", detail: String(err?.message ?? err) });
  }

  // ===== Débito =====
  const { data: consume, error: consumeErr } = await admin.rpc(
    "consume_workspace_credits",
    {
      p_workspace_id: tpl.workspace_id,
      p_user_id: user.id,
      p_amount: COST,
      p_action_type: "template_image",
      p_reference_id: tpl.id,
      p_metadata: { template_id: tpl.id, background_mode: backgroundMode, ai_calls: aiCallsForBackground },
    },
  );
  if (consumeErr) return json(500, { error: consumeErr.message });
  const row = Array.isArray(consume) ? consume[0] : consume;
  if (!row?.success) return json(402, { error: row?.error ?? "Créditos insuficientes" });

  // ===== Upload final =====
  const targetPath = `${user.id}/${crypto.randomUUID()}.png`;
  const { error: upErr } = await admin.storage
    .from("content-images")
    .upload(targetPath, finalPng, { contentType: "image/png", upsert: true });
  if (upErr) return json(500, { error: "Falha subindo imagem", detail: upErr.message });
  const { data: pub } = admin.storage.from("content-images").getPublicUrl(targetPath);
  const finalUrl = pub.publicUrl;

  // ===== Action =====
  const { data: action, error: actErr } = await admin
    .from("actions")
    .insert({
      user_id: user.id,
      brand_id: tpl.brand_id,
      type: "template_image",
      details: {
        template_id: tpl.id,
        fills,
        background_mode: backgroundMode,
        background_prompt: backgroundMode === "new" ? backgroundPrompt : undefined,
      },
      result: { imageUrl: finalUrl, description: "Geração via template" },
    })
    .select("id")
    .single();
  if (actErr) return json(500, { error: actErr.message });

  // ===== Caption automática (best-effort) =====
  let caption: string | null = null;
  try {
    const { data: capData } = await admin.functions.invoke("generate-caption", {
      body: { action_id: action.id, image_url: finalUrl, brand_id: tpl.brand_id },
    });
    caption = capData?.caption ?? null;
  } catch (err) {
    console.warn("generate-caption falhou (não-fatal):", err);
  }

  return json(200, {
    action_id: action.id,
    template_id: tpl.id,
    image_url: finalUrl,
    background_mode: backgroundMode,
    new_balance: row.new_balance,
    credit_mode: row.credit_mode,
    caption,
  });
});

function buildFontFetchers(admin: any): FontFetchers {
  return {
    fromMemory: (k) => mem.get(k),
    putMemory: (k, b) => void mem.set(k, b),
    fromBucket: async (k) => {
      const { data, error } = await admin.storage.from(FONT_BUCKET).download(k);
      if (error || !data) return null;
      return new Uint8Array(await data.arrayBuffer());
    },
    putBucket: async (k, b) => {
      await admin.storage.from(FONT_BUCKET).upload(k, b, {
        contentType: "font/ttf",
        upsert: true,
      });
    },
    fromGoogle: async (family, weight) => {
      const cssRes = await fetch(googleFontsCssUrl(family, weight), {
        headers: {
          // UA real para CSS retornar TTF (Google entrega woff2 para browsers modernos).
          "User-Agent":
            "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/35.0 Safari/537.36",
        },
      });
      const css = await cssRes.text();
      const url = pickFontUrlFromCss(css);
      if (!url) throw new Error(`Google Fonts: URL não encontrada para ${family}`);
      const r = await fetch(url);
      if (!r.ok) throw new Error(`Falha baixando ${url}: ${r.status}`);
      return new Uint8Array(await r.arrayBuffer());
    },
    fromCustom: async (fontId) => {
      const { data: row } = await admin
        .from("custom_fonts")
        .select("file_path")
        .eq("id", fontId)
        .maybeSingle();
      if (!row?.file_path) throw new Error(`custom_font ${fontId} não encontrada`);
      const { data: blob, error } = await admin.storage.from("custom-fonts").download(row.file_path);
      if (error || !blob) throw new Error(`Falha baixando custom font ${fontId}`);
      return new Uint8Array(await blob.arrayBuffer());
    },
  };
}

async function loadBrandLogo(admin: any, brandId: string): Promise<Uint8Array | null> {
  try {
    const { data: brand } = await admin.from("brands").select("logo").eq("id", brandId).maybeSingle();
    if (!brand?.logo) return null;
    if (brand.logo.startsWith("http")) {
      const r = await fetch(brand.logo);
      if (!r.ok) return null;
      return new Uint8Array(await r.arrayBuffer());
    }
    return null;
  } catch {
    return null;
  }
}

// Cache de fontes em memória (entre invocações dentro do mesmo isolate).
// `mem` é declarado em escopo de módulo acima.
