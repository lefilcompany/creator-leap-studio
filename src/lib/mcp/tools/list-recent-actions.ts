import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabaseClient";

export default defineTool({
  name: "list_recent_actions",
  title: "Listar ações recentes",
  description:
    "Lista as ações recentes do usuário (conteúdos, revisões, planos, vídeos) ainda não excluídas.",
  inputSchema: {
    action_type: z
      .string()
      .optional()
      .describe("Filtra por tipo (ex.: 'CONTENT', 'QUICK_CONTENT', 'VIDEO', 'REVIEW')."),
    limit: z.number().int().min(1).max(50).optional().describe("Padrão 20."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ action_type, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("actions")
      .select("id, action_type, title, brand_id, created_at, status")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (action_type) q = q.eq("action_type", action_type);
    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { actions: data ?? [] },
    };
  },
});
