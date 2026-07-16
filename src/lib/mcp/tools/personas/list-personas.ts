import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, notAuthenticated, okResult, supabaseForUser } from "../../_shared/supabase";

export default defineTool({
  name: "list_personas",
  title: "Listar personas",
  description: "Lista as personas acessíveis pelo usuário. Filtra por marca opcionalmente.",
  inputSchema: {
    brand_id: z.string().uuid().optional().describe("Filtra personas de uma marca."),
    limit: z.number().int().min(1).max(100).optional().describe("Máx. de linhas (padrão 25)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ brand_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    let q = supabaseForUser(ctx)
      .from("personas")
      .select("id, name, age, gender, location, main_goal, brand_id, created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 25);
    if (brand_id) q = q.eq("brand_id", brand_id);
    const { data, error } = await q;
    if (error) return errorResult(error.message);
    return okResult(data ?? [], "personas");
  },
});
