import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  shouldUseFakeAi,
  TEMPLATE_BUCKET,
  templateStoragePath,
  validateImportRequest,
  type TextZone,
} from "../_shared/templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-template-fake-ai",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Mock determinístico para testes (admin@admin.com com header).
function fakeDetect(): {
  text_zones: TextZone[];
  logo_slot: null;
  width: number;
  height: number;
  preview_base64: string;
  clean_background_base64: string;
} {
  // 1x1 PNG transparente em base64 (placeholder válido).
  const PNG_1PX =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
  return {
    text_zones: [
      {
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
      },
    ],
    logo_slot: null,
    width: 1080,
    height: 1080,
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

  const brandId = body.brand_id as string;
  const name = (body.name as string).trim();

  // Confere acesso à brand (RLS faz o trabalho).
  const { data: brand, error: brandErr } = await userClient
    .from("brands")
    .select("id, team_id")
    .eq("id", brandId)
    .maybeSingle();
  if (brandErr) return json(500, { error: brandErr.message });
  if (!brand) return json(403, { error: "Marca não acessível" });

  // Mock de IA é restrito a system admin.
  const { data: isAdminData } = await adminClient.rpc("has_role", {
    _user_id: user.id,
    _role: "system",
  });
  const useFake = shouldUseFakeAi({
    header: req.headers.get("x-template-fake-ai"),
    isSystemAdmin: isAdminData === true,
  });

  if (!useFake) {
    // Pipeline real (Gemini Vision + inpainting) será detalhada na ADR 0003.
    return json(501, {
      error: "Pipeline de IA será habilitada na entrega da ADR 0003",
    });
  }

  const fake = fakeDetect();

  // INSERT como service_role para garantir workspace_id resolvido por trigger
  // mas escopando user_id ao caller.
  const { data: inserted, error: insertErr } = await adminClient
    .from("brand_templates")
    .insert({
      brand_id: brandId,
      user_id: user.id,
      name,
      source_type: validation.sourceType,
      source_file_path: "pending",
      width: fake.width,
      height: fake.height,
      text_zones: fake.text_zones,
      logo_slot: fake.logo_slot,
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

  // Sobe arquivos mockados.
  const sourceName = validation.sourceType === "pdf" ? "source.pdf" : "source.png";
  const sourcePath = templateStoragePath(wsId, brandId, tplId, sourceName);
  const previewPath = templateStoragePath(wsId, brandId, tplId, "preview.png");
  const cleanPath = templateStoragePath(wsId, brandId, tplId, "clean_background.png");

  const decode = (b64: string) =>
    Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

  await adminClient.storage.from(TEMPLATE_BUCKET).upload(
    sourcePath,
    decode(fake.preview_base64),
    { contentType: validation.sourceType === "pdf" ? "application/pdf" : "image/png", upsert: true },
  );
  await adminClient.storage.from(TEMPLATE_BUCKET).upload(
    previewPath,
    decode(fake.preview_base64),
    { contentType: "image/png", upsert: true },
  );
  await adminClient.storage.from(TEMPLATE_BUCKET).upload(
    cleanPath,
    decode(fake.clean_background_base64),
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
    text_zones: fake.text_zones,
    logo_slot: fake.logo_slot,
    width: fake.width,
    height: fake.height,
    paths: { source: sourcePath, preview: previewPath, clean_background: cleanPath },
  });
});
