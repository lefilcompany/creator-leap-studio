import { createClient } from "npm:@supabase/supabase-js@2.57.2";
import { deductUserCredits, recordUserCreditUsage, getUserCredits } from "../_shared/userCredits.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PPTX_NO_WATERMARK_COST = 2;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claims.claims.sub;

    // Service role client to safely deduct
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const current = await getUserCredits(adminClient, userId);
    if (!current) {
      return new Response(JSON.stringify({ error: "Usuário não encontrado" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (current.credits < PPTX_NO_WATERMARK_COST) {
      return new Response(JSON.stringify({
        error: "Créditos insuficientes",
        required: PPTX_NO_WATERMARK_COST,
        available: current.credits,
      }), {
        status: 402,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const creditsBefore = current.credits;
    const result = await deductUserCredits(adminClient, userId, PPTX_NO_WATERMARK_COST);
    if (!result.success) {
      return new Response(JSON.stringify({ error: result.error || "Erro ao deduzir créditos" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await recordUserCreditUsage(adminClient, {
      userId,
      teamId: current.teamId,
      actionType: "PPTX_EXPORT_NO_WATERMARK",
      creditsUsed: PPTX_NO_WATERMARK_COST,
      creditsBefore,
      creditsAfter: result.newCredits,
      description: "Exportação PPTX sem marca d'água",
    });

    return new Response(JSON.stringify({
      success: true,
      newCredits: result.newCredits,
      charged: PPTX_NO_WATERMARK_COST,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("charge-pptx-export error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Erro inesperado" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
