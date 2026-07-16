import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, notAuthenticated, okResult, supabaseForUser } from "../../_shared/supabase";

export default defineTool({
  name: "list_themes",
  title: "Listar temas estratégicos",
  description: "Lista as editorias/temas estratégicos acessíveis. Filtra por marca opcionalmente.",
  inputSchema: {
    brand_id: z.string().uuid().optional(),
    limit: z.number().int().min(1).max(100).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ brand_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    let q = supabaseForUser(ctx)
      .from("strategic_themes")
      .select("id, title, description, brand_id, tone_of_voice, macro_themes, created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 25);
    if (brand_id) q = q.eq("brand_id", brand_id);
    const { data, error } = await q;
    if (error) return errorResult(error.message);
    return okResult(data ?? [], "themes");
  },
});
