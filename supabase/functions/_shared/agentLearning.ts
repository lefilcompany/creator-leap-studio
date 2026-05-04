// Helper para injetar aprendizado dos agentes nos prompts.
// Busca os feedbacks recentes (positivos e negativos) por marca + agente
// e devolve um bloco em texto pronto para concatenar no system/user prompt.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export type AgentId =
  | "calendar_briefing"      // briefing principal do calendário
  | "calendar_items"         // pautas (calendar items)
  | "copy_caption"           // legenda do post
  | "image_briefing"         // briefing visual da imagem
  | "image_generation"       // geração de imagem
  | "video_generation";      // geração de vídeo

interface LoadOptions {
  brandId?: string | null;
  agentId: AgentId;
  positiveLimit?: number;
  negativeLimit?: number;
}

interface FeedbackRow {
  rating: "positive" | "negative";
  comment: string | null;
  content_snapshot: any;
  created_at: string;
}

function summarizeSnapshot(snap: any): string {
  if (!snap) return "";
  if (typeof snap === "string") return snap.slice(0, 400);
  // Try common keys
  const candidates = [
    snap.title, snap.text, snap.briefing, snap.caption,
    snap.description, snap.summary, snap.prompt,
  ].filter((v) => typeof v === "string" && v.trim().length > 0);
  if (candidates.length > 0) return String(candidates[0]).slice(0, 400);
  try {
    return JSON.stringify(snap).slice(0, 400);
  } catch {
    return "";
  }
}

/**
 * Carrega os feedbacks mais recentes para uma marca + agente e devolve
 * um bloco de texto formatado, ou string vazia se não houver nada útil.
 */
export async function buildAgentLearningBlock(opts: LoadOptions): Promise<string> {
  if (!opts.brandId) return "";

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return "";

  const positiveLimit = opts.positiveLimit ?? 5;
  const negativeLimit = opts.negativeLimit ?? 5;

  const sb = createClient(supabaseUrl, serviceKey);

  const { data, error } = await sb
    .from("agent_feedback")
    .select("rating, comment, content_snapshot, created_at")
    .eq("brand_id", opts.brandId)
    .eq("agent_id", opts.agentId)
    .order("created_at", { ascending: false })
    .limit(40);

  if (error || !data || data.length === 0) return "";

  const positives = (data as FeedbackRow[])
    .filter((d) => d.rating === "positive")
    .slice(0, positiveLimit);
  const negatives = (data as FeedbackRow[])
    .filter((d) => d.rating === "negative")
    .slice(0, negativeLimit);

  if (positives.length === 0 && negatives.length === 0) return "";

  const lines: string[] = [];
  lines.push("===== APRENDIZADO COM FEEDBACK DESTA MARCA =====");
  lines.push(
    "Os exemplos abaixo são feedbacks reais de quem aprovou ou ajustou conteúdos parecidos. Use-os como referência forte de estilo, tom e direção. Repita os padrões aprovados; evite os padrões reprovados."
  );

  if (positives.length > 0) {
    lines.push("");
    lines.push("APROVADOS (siga esse padrão):");
    positives.forEach((p, i) => {
      const snap = summarizeSnapshot(p.content_snapshot);
      const c = (p.comment || "").trim();
      lines.push(
        `${i + 1}. ${snap ? `Conteúdo: "${snap}"` : ""}${c ? `\n   Comentário do usuário: ${c}` : ""}`
      );
    });
  }

  if (negatives.length > 0) {
    lines.push("");
    lines.push("REPROVADOS (evite esse padrão):");
    negatives.forEach((p, i) => {
      const snap = summarizeSnapshot(p.content_snapshot);
      const c = (p.comment || "").trim();
      lines.push(
        `${i + 1}. ${snap ? `Conteúdo: "${snap}"` : ""}${c ? `\n   Motivo: ${c}` : ""}`
      );
    });
  }

  lines.push("===== FIM DO APRENDIZADO =====");
  return lines.join("\n");
}
