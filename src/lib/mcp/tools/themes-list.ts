import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { PAGINATION_DEFAULT, PAGINATION_MAX, fail, ok, requireAuth, supabaseForUser } from "../_shared";

export default defineTool({
  name: "themes_list",
  title: "Listar temas estratégicos",
  description: "Lista temas estratégicos acessíveis ao usuário, com filtro por marca.",
  inputSchema: {
    brand_id: z.string().uuid().optional(),
    search: z.string().trim().max(100).optional(),
    limit: z.number().int().min(1).max(PAGINATION_MAX).default(PAGINATION_DEFAULT),
    offset: z.number().int().min(0).default(0),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ brand_id, search, limit, offset }, ctx) => {
    const uid = requireAuth(ctx);
    if (typeof uid !== "string") return uid;
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("strategic_themes")
      .select("id, title, brand_id, tone_of_voice, target_audience, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (brand_id) q = q.eq("brand_id", brand_id);
    if (search) q = q.ilike("title", `%${search}%`);
    const { data, error, count } = await q;
    if (error) return fail("db_error", error.message);
    return ok({ items: data ?? [], total: count ?? 0, limit, offset }, `${data?.length ?? 0} tema(s).`);
  },
});
