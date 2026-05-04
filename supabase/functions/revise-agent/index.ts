// Agente revisor: lê os feedbacks de um agente (opcionalmente filtrado por marca)
// e produz/atualiza um style_summary + regras estruturadas (do/don't) por marca.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ALL_AGENTS = [
  "calendar_briefing",
  "calendar_items",
  "copy_caption",
  "image_briefing",
  "image_generation",
  "video_generation",
] as const;

type AgentId = typeof ALL_AGENTS[number];

const AGENT_LABELS: Record<AgentId, string> = {
  calendar_briefing: "agente que cria o briefing do calendário",
  calendar_items: "agente que gera as pautas do calendário",
  copy_caption: "agente que escreve a legenda dos posts",
  image_briefing: "agente que escreve o briefing visual da imagem",
  image_generation: "agente que gera a imagem final",
  video_generation: "agente que gera o vídeo final",
};

interface ReviseInput {
  agentId?: AgentId | "all";
  brandId?: string | null;
  /** Se true, processa todas as combinações marca x agente que tenham feedbacks novos */
  scanAll?: boolean;
}

async function reviseOne(
  sb: any,
  agentId: AgentId,
  brandId: string,
  apiKey: string,
): Promise<{ ok: boolean; reason?: string }> {
  // Carrega últimos feedbacks
  const { data: feedbacks, error } = await sb
    .from("agent_feedback")
    .select("rating, comment, content_snapshot, created_at")
    .eq("agent_id", agentId)
    .eq("brand_id", brandId)
    .order("created_at", { ascending: false })
    .limit(60);

  if (error) return { ok: false, reason: error.message };
  if (!feedbacks || feedbacks.length === 0) {
    return { ok: false, reason: "no_feedbacks" };
  }

  const positives = feedbacks.filter((f: any) => f.rating === "positive");
  const negatives = feedbacks.filter((f: any) => f.rating === "negative");

  const summarize = (snap: any) => {
    if (!snap) return "";
    if (typeof snap === "string") return snap.slice(0, 600);
    const cands = [
      snap.title, snap.text, snap.briefing, snap.caption,
      snap.description, snap.summary, snap.prompt,
    ].filter((v) => typeof v === "string" && v.trim().length > 0);
    if (cands.length > 0) return String(cands[0]).slice(0, 600);
    try { return JSON.stringify(snap).slice(0, 600); } catch { return ""; }
  };

  const fmt = (arr: any[]) => arr.slice(0, 15).map((f, i) => {
    const snap = summarize(f.content_snapshot);
    const c = (f.comment || "").trim();
    return `${i + 1}. ${snap ? `Conteúdo: "${snap}"` : ""}${c ? `\n   Comentário: ${c}` : ""}`;
  }).join("\n");

  const prompt = `Você é o **Agente Revisor**. Sua função é analisar feedbacks reais de usuários sobre o trabalho do **${AGENT_LABELS[agentId]}** para uma marca específica e destilar regras claras de estilo que serão injetadas como contexto nesse agente para melhorar entregas futuras.

## Feedbacks APROVADOS (${positives.length}):
${positives.length ? fmt(positives) : "(nenhum)"}

## Feedbacks REPROVADOS (${negatives.length}):
${negatives.length ? fmt(negatives) : "(nenhum)"}

## Sua tarefa
Produza:
1. **style_summary**: parágrafo único (máx. 400 palavras) descrevendo o estilo aprovado pela marca para este agente. Direto, em segunda pessoa ("Use…", "Evite…").
2. **positive_rules**: 5–10 regras curtas e acionáveis do que SEMPRE fazer (frases imperativas, máx. 140 chars cada).
3. **negative_rules**: 5–10 regras curtas do que NUNCA fazer (frases imperativas, máx. 140 chars cada).

Se um lado não tiver dados suficientes, devolva array vazio.`;

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: "Você é um revisor sênior de qualidade de IA generativa para marketing." },
        { role: "user", content: prompt },
      ],
      tools: [{
        type: "function",
        function: {
          name: "save_style_review",
          description: "Salva o resumo de estilo e regras",
          parameters: {
            type: "object",
            properties: {
              style_summary: { type: "string" },
              positive_rules: { type: "array", items: { type: "string" } },
              negative_rules: { type: "array", items: { type: "string" } },
            },
            required: ["style_summary", "positive_rules", "negative_rules"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "save_style_review" } },
    }),
  });

  if (!resp.ok) {
    const t = await resp.text();
    return { ok: false, reason: `ai_error_${resp.status}_${t.slice(0, 200)}` };
  }

  const j = await resp.json();
  const args = j.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
  if (!args) return { ok: false, reason: "no_tool_call" };
  let parsed;
  try { parsed = JSON.parse(args); } catch { return { ok: false, reason: "bad_json" }; }

  // Upsert; preserva manually_edited (se editado, não sobrescreve)
  const { data: existing } = await sb
    .from("agent_style_summaries")
    .select("id, manually_edited")
    .eq("brand_id", brandId)
    .eq("agent_id", agentId)
    .maybeSingle();

  if (existing?.manually_edited) {
    return { ok: false, reason: "manually_edited_skipped" };
  }

  const payload = {
    brand_id: brandId,
    agent_id: agentId,
    style_summary: parsed.style_summary,
    positive_rules: parsed.positive_rules || [],
    negative_rules: parsed.negative_rules || [],
    feedbacks_processed: feedbacks.length,
    last_revised_at: new Date().toISOString(),
  };

  if (existing) {
    await sb.from("agent_style_summaries").update(payload).eq("id", existing.id);
  } else {
    await sb.from("agent_style_summaries").insert(payload);
  }
  return { ok: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!apiKey || !supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: "missing_env" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sb = createClient(supabaseUrl, serviceKey);

    const body: ReviseInput = await req.json().catch(() => ({}));

    // Define alvos
    let targets: { agentId: AgentId; brandId: string }[] = [];

    if (body.scanAll || body.agentId === "all" || (!body.agentId && !body.brandId)) {
      // Pega todas combinações marca+agente que têm feedback
      const { data } = await sb
        .from("agent_feedback")
        .select("agent_id, brand_id")
        .not("brand_id", "is", null);
      const seen = new Set<string>();
      (data || []).forEach((r: any) => {
        const key = `${r.agent_id}::${r.brand_id}`;
        if (!seen.has(key) && ALL_AGENTS.includes(r.agent_id)) {
          seen.add(key);
          targets.push({ agentId: r.agent_id, brandId: r.brand_id });
        }
      });
    } else if (body.agentId && body.brandId) {
      targets.push({ agentId: body.agentId as AgentId, brandId: body.brandId });
    } else if (body.agentId) {
      const { data } = await sb
        .from("agent_feedback")
        .select("brand_id")
        .eq("agent_id", body.agentId)
        .not("brand_id", "is", null);
      const seen = new Set<string>();
      (data || []).forEach((r: any) => {
        if (!seen.has(r.brand_id)) {
          seen.add(r.brand_id);
          targets.push({ agentId: body.agentId as AgentId, brandId: r.brand_id });
        }
      });
    } else if (body.brandId) {
      ALL_AGENTS.forEach((a) => targets.push({ agentId: a, brandId: body.brandId! }));
    }

    const results: any[] = [];
    for (const t of targets) {
      const r = await reviseOne(sb, t.agentId, t.brandId, apiKey);
      results.push({ ...t, ...r });
    }

    return new Response(JSON.stringify({ ok: true, processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("revise-agent error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
