// Finalize image overlay: receives an image composited client-side
// (via Canvas 2D) and swaps the action's asset for that final version.
// This function does NO image processing on the server — it only
// decodes base64 and uploads bytes — so it stays well under the
// Edge Runtime CPU budget.
//
// Contract:
//   POST /functions/v1/finalize-image-overlay
//   { actionId: string, finalImageBase64: string ("data:image/png;base64,..." or raw base64) }
//
//   200 { imageUrl }
//   401 unauthenticated
//   403 caller does not own the action
//   404 action not found
//   400 invalid payload
//
// Idempotency: if the action already has overlay_status='applied',
// the current imageUrl is returned without re-uploading.

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function decodeBase64(input: string): Uint8Array {
  const b64 = input.startsWith("data:") ? input.split(",", 2)[1] || "" : input;
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) return json({ error: "Unauthorized" }, 401);

    const { data: userData, error: authError } = await supabase.auth.getUser(token);
    if (authError || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    let payload: { actionId?: string; finalImageBase64?: string };
    try {
      payload = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    const { actionId, finalImageBase64 } = payload || {};
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!actionId || !uuidRegex.test(actionId)) return json({ error: "actionId inválido" }, 400);
    if (!finalImageBase64 || typeof finalImageBase64 !== "string" || finalImageBase64.length < 100) {
      return json({ error: "finalImageBase64 ausente ou inválido" }, 400);
    }
    // Safety cap ~20MB base64
    if (finalImageBase64.length > 20 * 1024 * 1024) {
      return json({ error: "Imagem muito grande" }, 413);
    }

    const { data: action, error: actionError } = await supabase
      .from("actions")
      .select("id, user_id, team_id, result, overlay_status, asset_path, thumb_path")
      .eq("id", actionId)
      .maybeSingle();
    if (actionError) return json({ error: "Erro ao carregar action" }, 500);
    if (!action) return json({ error: "Action não encontrada" }, 404);
    if (action.user_id !== userId) return json({ error: "Forbidden" }, 403);

    // Idempotent short-circuit
    if (action.overlay_status === "applied" && action.result?.imageUrl) {
      return json({ imageUrl: action.result.imageUrl, alreadyApplied: true });
    }

    let bytes: Uint8Array;
    try {
      bytes = decodeBase64(finalImageBase64);
    } catch {
      return json({ error: "Falha ao decodificar imagem" }, 400);
    }

    const scope = action.team_id || userId;
    const fileName = `content-images/${scope}/${Date.now()}_overlay.png`;

    const { error: uploadError } = await supabase.storage
      .from("content-images")
      .upload(fileName, bytes, { contentType: "image/png", upsert: false });

    if (uploadError) {
      console.error("[finalize-image-overlay] upload failed:", uploadError);
      // Mark failure but keep original image intact
      await supabase.from("actions")
        .update({ overlay_status: "failed" })
        .eq("id", actionId);
      return json({ error: "Falha no upload da imagem final" }, 500);
    }

    const { data: urlData } = supabase.storage.from("content-images").getPublicUrl(fileName);
    const publicUrl = urlData.publicUrl;

    const nextResult = { ...(action.result || {}), imageUrl: publicUrl };
    await supabase.from("actions")
      .update({
        result: nextResult,
        asset_path: fileName,
        thumb_path: fileName,
        overlay_status: "applied",
      })
      .eq("id", actionId);

    return json({ imageUrl: publicUrl });
  } catch (err) {
    console.error("[finalize-image-overlay] error:", err);
    return json({ error: err instanceof Error ? err.message : "Erro desconhecido" }, 500);
  }
});
