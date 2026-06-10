import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { CREDIT_COSTS } from "../_shared/creditCosts.ts";
import { isUuid, TEMPLATE_BUCKET } from "../_shared/templates.ts";

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
  const admin = createClient(supabaseUrl, serviceKey);

  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) return json(401, { error: "Unauthorized" });
  const user = userData.user;

  let body: { template_id?: string; fills?: Record<string, string> };
  try { body = await req.json(); } catch { return json(400, { error: "Invalid JSON" }); }

  if (!isUuid(body.template_id)) return json(400, { error: "template_id inválido" });

  // RLS valida acesso.
  const { data: tpl, error: tplErr } = await userClient
    .from("brand_templates")
    .select("id, brand_id, workspace_id, status, preview_path")
    .eq("id", body.template_id)
    .is("deleted_at", null)
    .maybeSingle();
  if (tplErr) return json(500, { error: tplErr.message });
  if (!tpl) return json(404, { error: "Template não encontrado" });
  if (tpl.status !== "ready")
    return json(422, { error: "Template não está pronto", status: tpl.status });

  // Debita créditos.
  const { data: consume, error: consumeErr } = await admin.rpc(
    "consume_workspace_credits",
    {
      p_workspace_id: tpl.workspace_id,
      p_user_id: user.id,
      p_amount: COST,
      p_action_type: "template_image",
      p_reference_id: tpl.id,
      p_metadata: { template_id: tpl.id },
    },
  );
  if (consumeErr) return json(500, { error: consumeErr.message });
  const row = Array.isArray(consume) ? consume[0] : consume;
  if (!row?.success) return json(402, { error: row?.error ?? "Créditos insuficientes" });

  // ⚠️ STUB: pipeline determinística (skia-canvas + Art Director) virá na ADR 0003.
  // Hoje devolvemos a própria preview.png como imagem final.
  let finalUrl: string | null = null;
  if (tpl.preview_path) {
    const { data: blob, error: dlErr } = await admin.storage
      .from(TEMPLATE_BUCKET)
      .download(tpl.preview_path);
    if (!dlErr && blob) {
      const targetPath = `${user.id}/${crypto.randomUUID()}.png`;
      const { error: upErr } = await admin.storage
        .from("content-images")
        .upload(targetPath, blob, { contentType: "image/png", upsert: true });
      if (!upErr) {
        const { data: pub } = admin.storage.from("content-images").getPublicUrl(targetPath);
        finalUrl = pub.publicUrl;
      }
    }
  }

  const { data: action, error: actErr } = await admin
    .from("actions")
    .insert({
      user_id: user.id,
      brand_id: tpl.brand_id,
      type: "template_image",
      details: { template_id: tpl.id, fills: body.fills ?? {}, stub: true },
      result: { imageUrl: finalUrl, description: "Stub: preview do template" },
    })
    .select("id")
    .single();
  if (actErr) return json(500, { error: actErr.message });

  return json(200, {
    action_id: action.id,
    template_id: tpl.id,
    image_url: finalUrl,
    new_balance: row.new_balance,
    credit_mode: row.credit_mode,
    stub: true,
  });
});
