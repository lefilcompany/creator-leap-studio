import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabaseClient";
import { buildDeepLink } from "../deepLink";

export default defineTool({
  name: "update_brand",
  title: "Atualizar marca",
  description:
    "Atualiza campos de uma marca existente. Envie apenas os campos que deseja alterar. RLS garante que só o dono/time/workspace pode editar.",
  inputSchema: {
    brand_id: z.string().uuid(),
    name: z.string().min(1).max(120).optional(),
    responsible: z.string().optional(),
    segment: z.string().optional(),
    values: z.string().optional(),
    keywords: z.string().optional(),
    goals: z.string().optional(),
    promise: z.string().optional(),
    restrictions: z.string().optional(),
    inspirations: z.string().optional(),
    success_metrics: z.string().optional(),
    brand_references: z.string().optional(),
    special_dates: z.string().optional(),
    crisis_info: z.string().optional(),
    milestones: z.string().optional(),
    collaborations: z.string().optional(),
    brand_color: z.string().optional(),
    avatar_url: z.string().url().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ brand_id, ...patch }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    if (Object.values(patch).every((v) => v === undefined)) {
      return { content: [{ type: "text", text: "Nenhum campo para atualizar." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("brands")
      .update(patch)
      .eq("id", brand_id)
      .select("id, name, segment, brand_color, avatar_url, updated_at")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Marca não encontrada ou sem permissão." }], isError: true };
    const brand = { ...data, deep_link: buildDeepLink("brand", data.id) };
    return {
      content: [{ type: "text", text: JSON.stringify(brand, null, 2) }],
      structuredContent: { brand },
    };
  },
});
