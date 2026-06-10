import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  extractCustomFontIds,
  findMissingFonts,
  isUuid,
  type FontAssets,
  type LogoSlot,
  type TextZone,
} from "../_shared/templates.ts";

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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return json(401, { error: "Unauthorized" });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) return json(401, { error: "Unauthorized" });

  let body: {
    template_id?: string;
    text_zones?: TextZone[];
    logo_slot?: LogoSlot | null;
    font_assets?: FontAssets;
  };
  try { body = await req.json(); } catch { return json(400, { error: "Invalid JSON" }); }

  if (!isUuid(body.template_id)) return json(400, { error: "template_id inválido" });
  if (!Array.isArray(body.text_zones) || body.text_zones.length === 0)
    return json(400, { error: "text_zones obrigatório" });
  if (!body.font_assets || typeof body.font_assets !== "object")
    return json(400, { error: "font_assets obrigatório" });

  const missing = findMissingFonts(body.text_zones, body.font_assets);
  if (missing.length > 0)
    return json(400, { error: "Fontes faltando em font_assets", missing });

  // Valida custom fonts acessíveis ao caller (RLS de custom_fonts faz o filtro).
  const customIds = extractCustomFontIds(body.font_assets);
  if (customIds.length > 0) {
    const { data: fonts, error: fErr } = await userClient
      .from("custom_fonts")
      .select("id")
      .in("id", customIds);
    if (fErr) return json(500, { error: fErr.message });
    const found = new Set((fonts ?? []).map((f) => f.id));
    const inaccessible = customIds.filter((id) => !found.has(id));
    if (inaccessible.length > 0)
      return json(400, { error: "Custom fonts inacessíveis", inaccessible });
  }

  // Verifica template acessível (RLS).
  const { data: tpl, error: tplErr } = await userClient
    .from("brand_templates")
    .select("id")
    .eq("id", body.template_id)
    .is("deleted_at", null)
    .maybeSingle();
  if (tplErr) return json(500, { error: tplErr.message });
  if (!tpl) return json(404, { error: "Template não encontrado" });

  const { error: upErr } = await userClient
    .from("brand_templates")
    .update({
      text_zones: body.text_zones,
      logo_slot: body.logo_slot ?? null,
      font_assets: body.font_assets,
      status: "ready",
    })
    .eq("id", body.template_id);
  if (upErr) return json(500, { error: upErr.message });

  return json(200, { template_id: body.template_id, status: "ready" });
});
