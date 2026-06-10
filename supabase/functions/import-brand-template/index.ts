import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  shouldUseFakeAi,
  TEMPLATE_BUCKET,
  templateStoragePath,
  validateImportRequest,
  type TextZone,
} from "../_shared/templates.ts";
import { detectZones } from "../_shared/templateVision.ts";
import { inpaintBackground } from "../_shared/templateInpainting.ts";
import { CREDIT_COSTS } from "../_shared/creditCosts.ts";

const IMPORT_COST = CREDIT_COSTS.TEMPLATE_IMPORT;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-template-fake-ai",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const decode = (b64: string) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

// Mock determinístico (apenas system admin com header).
function fakeDetect(width: number, height: number): {
  text_zones: TextZone[];
  logo_slot: null;
  preview_base64: string;
  clean_background_base64: string;
} {
  const PNG_1PX =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
  return {
    text_zones: [{
      id: crypto.randomUUID(),
      label: "Título",
      bbox: { x: 0.05, y: 0.1, w: 0.9, h: 0.18 },
      font_family: "Inter",
      font_weight: 700,
      font_size_px: 64,
      color: "#0F172A",
      align: "left",
      line_height: 1.1,
      original_text: "Mock heading",
    }],
    logo_slot: null,
    preview_base64: PNG_1PX,
    clean_background_base64: PNG_1PX,
  };
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
  const adminClient = createClient(supabaseUrl, serviceKey);

  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) return json(401, { error: "Unauthorized" });
  const user = userData.user;

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON" });
  }

  const validation = validateImportRequest(body as never);
  if (!validation.ok) return json(400, { errors: validation.errors });

  // Campos extra obrigatórios do pipeline real.
  const imageBase64 = body.image_base64;
  const sourceBase64 = body.source_base64 ?? imageBase64;
  const width = Number(body.width);
  const height = Number(body.height);
  if (typeof imageBase64 !== "string" || imageBase64.length < 100) {
    return json(400, { error: "image_base64 (PNG rasterizado) é obrigatório" });
  }
  if (!Number.isFinite(width) || width < 64 || width > 8192) {
    return json(400, { error: "width inválido" });
  }
  if (!Number.isFinite(height) || height < 64 || height > 8192) {
    return json(400, { error: "height inválido" });
  }

  const brandId = body.brand_id as string;
  const name = (body.name as string).trim();

  const { data: brand, error: brandErr } = await userClient
    .from("brands")
    .select("id")
    .eq("id", brandId)
    .maybeSingle();
  if (brandErr) return json(500, { error: brandErr.message });
  if (!brand) return json(403, { error: "Marca não acessível" });

  const { data: isAdminData } = await adminClient.rpc("has_role", {
    _user_id: user.id,
    _role: "system",
  });
  const useFake = shouldUseFakeAi({
    header: req.headers.get("x-template-fake-ai"),
    isSystemAdmin: isAdminData === true,
  });

  // Detecção + inpainting.
  let textZones: TextZone[];
  let logoSlot: any = null;
  let cleanBase64: string;
  if (useFake) {
    const fake = fakeDetect(width, height);
    textZones = fake.text_zones;
    logoSlot = fake.logo_slot;
    cleanBase64 = fake.clean_background_base64;
  } else {
    if (!geminiKey) {
      console.error("[import-brand-template] GEMINI_API_KEY ausente");
      return json(500, { error: "GEMINI_API_KEY ausente" });
    }
    try {
      console.log("[import-brand-template] Vision detectZones start", { width, height, bytes: imageBase64.length });
      const vision = await detectZones(geminiKey, imageBase64 as string);
      console.log("[import-brand-template] Vision OK", { zones: vision.text_zones.length, hasLogo: !!vision.logo_slot });
      textZones = vision.text_zones;
      logoSlot = vision.logo_slot;
      console.log("[import-brand-template] Inpainting start");
      const clean = await inpaintBackground(
        geminiKey,
        imageBase64 as string,
        vision.text_zones,
        vision.logo_slot,
      );
      cleanBase64 = clean.base64;
      console.log("[import-brand-template] Inpainting OK", { bytes: cleanBase64.length });
    } catch (err: any) {
      console.error("[import-brand-template] AI pipeline failure", {
        status: err?.status,
        message: String(err?.message ?? err),
      });
      const status = err?.status >= 400 && err?.status < 500 ? 422 : 502;
      return json(status, { error: "Falha no pipeline de IA", detail: String(err?.message ?? err) });
    }
  }

  // Persistência.
  const { data: inserted, error: insertErr } = await adminClient
    .from("brand_templates")
    .insert({
      brand_id: brandId,
      user_id: user.id,
      name,
      source_type: validation.sourceType,
      source_file_path: "pending",
      width,
      height,
      text_zones: textZones,
      logo_slot: logoSlot,
      status: "draft",
    })
    .select("id, workspace_id")
    .single();

  if (insertErr) {
    if (insertErr.message.includes("Limite de 10 templates")) {
      return json(422, { error: insertErr.message });
    }
    return json(500, { error: insertErr.message });
  }

  const tplId = inserted.id;
  const wsId = inserted.workspace_id;
  const sourceName = validation.sourceType === "pdf" ? "source.pdf" : "source.png";
  const sourcePath = templateStoragePath(wsId, brandId, tplId, sourceName);
  const previewPath = templateStoragePath(wsId, brandId, tplId, "preview.png");
  const cleanPath = templateStoragePath(wsId, brandId, tplId, "clean_background.png");

  await adminClient.storage.from(TEMPLATE_BUCKET).upload(
    sourcePath,
    decode(sourceBase64 as string),
    {
      contentType: validation.sourceType === "pdf" ? "application/pdf" : "image/png",
      upsert: true,
    },
  );
  await adminClient.storage.from(TEMPLATE_BUCKET).upload(
    previewPath,
    decode(imageBase64 as string),
    { contentType: "image/png", upsert: true },
  );
  await adminClient.storage.from(TEMPLATE_BUCKET).upload(
    cleanPath,
    decode(cleanBase64),
    { contentType: "image/png", upsert: true },
  );

  await adminClient
    .from("brand_templates")
    .update({
      source_file_path: sourcePath,
      preview_path: previewPath,
      clean_background_path: cleanPath,
    })
    .eq("id", tplId);

  return json(200, {
    template_id: tplId,
    workspace_id: wsId,
    text_zones: textZones,
    logo_slot: logoSlot,
    width,
    height,
    paths: { source: sourcePath, preview: previewPath, clean_background: cleanPath },
  });
});
