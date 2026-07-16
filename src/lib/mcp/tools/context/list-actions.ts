import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, notAuthenticated, okResult, supabaseForUser } from "../../_shared/supabase";

export default defineTool({
  name: "list_actions",
  title: "Listar peças criadas (histórico)",
  description: "Lista as peças (actions) criadas pelo usuário, com filtros por marca e tipo.",
  inputSchema: {
    brand_id: z.string().uuid().optional(),
    type: z.string().optional().describe("Tipo da action (ex.: 'image', 'video', 'quick')."),
    limit: z.number().int().min(1).max(100).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ brand_id, type, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    let q = supabaseForUser(ctx)
      .from("actions")
      .select("id, type, status, approved, brand_id, created_at, details, result")
      .is("deleted_at", null)
      .is("parent_action_id", null)
      .order("created_at", { ascending: false })
      .limit(limit ?? 25);
    if (brand_id) q = q.eq("brand_id", brand_id);
    if (type) q = q.eq("type", type);
    const { data, error } = await q;
    if (error) return errorResult(error.message);
    return okResult(data ?? [], "actions");
  },
});
