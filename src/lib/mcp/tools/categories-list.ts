import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { PAGINATION_DEFAULT, PAGINATION_MAX, fail, ok, requireAuth, supabaseForUser } from "../_shared";

export default defineTool({
  name: "categories_list",
  title: "Listar categorias",
  description: "Lista as categorias de conteúdo acessíveis ao usuário (próprias ou compartilhadas via equipe).",
  inputSchema: {
    limit: z.number().int().min(1).max(PAGINATION_MAX).default(PAGINATION_DEFAULT),
    offset: z.number().int().min(0).default(0),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, offset }, ctx) => {
    const uid = requireAuth(ctx);
    if (typeof uid !== "string") return uid;
    const supabase = supabaseForUser(ctx);
    const { data, error, count } = await supabase
      .from("action_categories")
      .select("id, name, description, color, visibility, user_id, team_id, created_at", { count: "exact" })
      .order("name")
      .range(offset, offset + limit - 1);
    if (error) return fail("db_error", error.message);
    return ok({ items: data ?? [], total: count ?? 0, limit, offset }, `${data?.length ?? 0} categoria(s).`);
  },
});
