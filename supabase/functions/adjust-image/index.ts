import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { CREDIT_COSTS } from "../_shared/creditCosts.ts";
import { recordCreditUsage } from "../_shared/creditHistory.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error("Não autorizado");
    }

    const { imageUrl, adjustmentPrompt, brandId, themeId } = await req.json();

    if (!imageUrl || !adjustmentPrompt) {
      throw new Error("imageUrl e adjustmentPrompt são obrigatórios");
    }

    // Buscar profile do usuário
    const { data: profile } = await supabaseClient
      .from("profiles")
      .select("team_id")
      .eq("id", user.id)
      .single();

    if (!profile?.team_id) {
      throw new Error("Time não encontrado");
    }

    // Verificar créditos
    const { data: team } = await supabaseClient
      .from("teams")
      .select("credits")
      .eq("id", profile.team_id)
      .single();

    if (!team || team.credits < CREDIT_COSTS.IMAGE_EDIT) {
      return new Response(
        JSON.stringify({
          error: "Créditos insuficientes",
          required: CREDIT_COSTS.IMAGE_EDIT,
          available: team?.credits || 0,
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Buscar contexto da marca e tema se fornecidos
    let brandContext = "";
    let themeContext = "";

    if (brandId) {
      const { data: brand } = await supabaseClient
        .from("brands")
        .select("*")
        .eq("id", brandId)
        .single();

      if (brand) {
        brandContext = `Marca: ${brand.name}\nSegmento: ${brand.segment}\nPalavras-chave: ${brand.keywords || ""}`;
      }
    }

    if (themeId) {
      const { data: theme } = await supabaseClient
        .from("strategic_themes")
        .select("*")
        .eq("id", themeId)
        .single();

      if (theme) {
        themeContext = `Tema: ${theme.title}\nDescrição: ${theme.description}`;
      }
    }

    // Construir prompt com contexto
    const fullPrompt = `${adjustmentPrompt}

${brandContext ? `Contexto da marca:\n${brandContext}\n` : ""}
${themeContext ? `Contexto do tema:\n${themeContext}\n` : ""}

Mantenha a essência da imagem original, apenas faça os ajustes solicitados.`;

    // Chamar Lovable AI para ajustar a imagem
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY não configurada");
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: fullPrompt,
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUrl,
                },
              },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Erro da AI Gateway:", response.status, errorText);
      throw new Error("Erro ao ajustar imagem com IA");
    }

    const aiData = await response.json();
    const adjustedImageUrl = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!adjustedImageUrl) {
      throw new Error("IA não retornou imagem ajustada");
    }

    // Deduzir créditos
    const creditsBefore = team.credits;
    const creditsAfter = creditsBefore - CREDIT_COSTS.IMAGE_EDIT;

    const { error: updateError } = await supabaseClient
      .from("teams")
      .update({ credits: creditsAfter })
      .eq("id", profile.team_id);

    if (updateError) {
      console.error("Erro ao atualizar créditos:", updateError);
      throw new Error("Erro ao processar créditos");
    }

    // Registrar no histórico
    await recordCreditUsage(supabaseClient, {
      teamId: profile.team_id,
      userId: user.id,
      actionType: "IMAGE_EDIT",
      creditsUsed: CREDIT_COSTS.IMAGE_EDIT,
      creditsBefore,
      creditsAfter,
      description: "Ajuste de imagem com IA",
      metadata: {
        adjustmentPrompt,
        brandId,
        themeId,
      },
    });

    return new Response(
      JSON.stringify({
        adjustedImageUrl,
        creditsRemaining: creditsAfter,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro em adjust-image:", error);
    const errorMessage = error instanceof Error ? error.message : "Erro desconhecido";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
