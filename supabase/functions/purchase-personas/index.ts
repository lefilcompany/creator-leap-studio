import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const COST_PER_PERSONA = 20;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(token);
    if (userErr || !userData.user) throw new Error("Not authenticated");
    const user = userData.user;

    const body = await req.json();
    const { brand_id, template_ids } = body as { brand_id: string; template_ids: string[] };

    if (!brand_id || !Array.isArray(template_ids) || template_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: "brand_id e template_ids são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Service role for atomic ops
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Fetch profile (credits + team)
    const { data: profile, error: profErr } = await admin
      .from("profiles")
      .select("id, credits, team_id")
      .eq("id", user.id)
      .single();
    if (profErr || !profile) throw new Error("Profile not found");

    const currentCredits = profile.credits || 0;

    // Verify brand ownership / access
    const { data: brand, error: brandErr } = await admin
      .from("brands")
      .select("id, name, user_id, team_id")
      .eq("id", brand_id)
      .single();
    if (brandErr || !brand) throw new Error("Marca não encontrada");
    const canAccess = brand.user_id === user.id || (brand.team_id && brand.team_id === profile.team_id);
    if (!canAccess) throw new Error("Sem acesso a essa marca");

    // Determine how many can be afforded (compra parcial)
    const maxAffordable = Math.floor(currentCredits / COST_PER_PERSONA);
    const toPurchaseIds = template_ids.slice(0, maxAffordable);

    if (toPurchaseIds.length === 0) {
      return new Response(
        JSON.stringify({
          error: "Créditos insuficientes",
          purchased: 0,
          required_per_persona: COST_PER_PERSONA,
          available_credits: currentCredits,
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch templates
    const { data: templates, error: tmplErr } = await admin
      .from("persona_templates")
      .select("*")
      .in("id", toPurchaseIds)
      .eq("is_active", true);
    if (tmplErr) throw tmplErr;
    if (!templates || templates.length === 0) throw new Error("Nenhuma persona válida encontrada");

    // Filter out templates whose name already exists for this brand (avoid duplicates)
    const { data: existingPersonas, error: existErr } = await admin
      .from("personas")
      .select("name")
      .eq("brand_id", brand_id);
    if (existErr) throw existErr;

    const existingNames = new Set(
      (existingPersonas || []).map((p: any) => (p.name || "").trim().toLowerCase())
    );

    const templatesToCreate = templates.filter(
      (t: any) => !existingNames.has((t.name || "").trim().toLowerCase())
    );
    const duplicatesSkipped = templates.length - templatesToCreate.length;

    if (templatesToCreate.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          purchased: 0,
          skipped: template_ids.length,
          duplicates_skipped: duplicatesSkipped,
          message: "Todas as personas selecionadas já existem nesta marca",
          new_balance: currentCredits,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const totalCost = templatesToCreate.length * COST_PER_PERSONA;
    const newBalance = currentCredits - totalCost;

    // Insert personas
    const personasToInsert = templatesToCreate.map((t: any) => ({
      brand_id,
      user_id: user.id,
      team_id: profile.team_id,
      name: t.name,
      gender: t.gender,
      age: t.age,
      location: t.location,
      professional_context: t.professional_context,
      beliefs_and_interests: t.beliefs_and_interests,
      content_consumption_routine: t.content_consumption_routine,
      main_goal: t.main_goal,
      challenges: t.challenges,
      preferred_tone_of_voice: t.preferred_tone_of_voice,
      purchase_journey_stage: t.purchase_journey_stage,
      interest_triggers: t.interest_triggers,
    }));

    const { data: createdPersonas, error: insErr } = await admin
      .from("personas")
      .insert(personasToInsert)
      .select("id, name");
    if (insErr) throw insErr;

    // Deduct credits
    const { error: updErr } = await admin
      .from("profiles")
      .update({ credits: newBalance })
      .eq("id", user.id);
    if (updErr) throw updErr;

    // Log credit history
    await admin.from("credit_history").insert({
      user_id: user.id,
      team_id: profile.team_id,
      action_type: "PURCHASE_PERSONAS",
      credits_used: totalCost,
      credits_before: currentCredits,
      credits_after: newBalance,
      description: `Compra de ${templatesToCreate.length} persona(s) para a marca ${brand.name}`,
      metadata: {
        brand_id,
        brand_name: brand.name,
        persona_count: templatesToCreate.length,
        persona_names: templatesToCreate.map((t: any) => t.name),
      },
    });

    const skipped = (template_ids.length - toPurchaseIds.length) + duplicatesSkipped;

    return new Response(
      JSON.stringify({
        success: true,
        purchased: createdPersonas?.length || 0,
        skipped,
        total_cost: totalCost,
        new_balance: newBalance,
        personas: createdPersonas,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[purchase-personas] error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
