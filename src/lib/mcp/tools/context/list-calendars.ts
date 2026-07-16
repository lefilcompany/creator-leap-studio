import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, notAuthenticated, okResult, supabaseForUser } from "../../_shared/supabase";

export default defineTool({
  name: "list_calendars",
  title: "Listar calendários de conteúdo",
  description: "Lista os calendários de conteúdo acessíveis pelo usuário.",
  inputSchema: {
    brand_id: z.string().uuid().optional(),
    limit: z.number().int().min(1).max(100).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ brand_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    let q = supabaseForUser(ctx)
      .from("content_calendars")
      .select("id, name, description, brand_id, persona_id, theme_id, status, reference_month, created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 25);
    if (brand_id) q = q.eq("brand_id", brand_id);
    const { data, error } = await q;
    if (error) return errorResult(error.message);
    return okResult(data ?? [], "calendars");
  },
});
