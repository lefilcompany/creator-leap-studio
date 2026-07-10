import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import {
  PAGINATION_DEFAULT,
  PAGINATION_MAX,
  fail,
  ok,
  requireAuth,
  supabaseForUser,
} from "../_shared";

export default defineTool({
  name: "brands_list",
  title: "Listar marcas",
  description:
    "Lista as marcas às quais o usuário autenticado tem acesso (via RLS), com busca por nome e paginação.",
  inputSchema: {
    search: z.string().trim().max(100).optional(),
    limit: z.number().int().min(1).max(PAGINATION_MAX).default(PAGINATION_DEFAULT),
    offset: z.number().int().min(0).default(0),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ search, limit, offset }, ctx) => {
    const uid = requireAuth(ctx);
    if (typeof uid !== "string") return uid;
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("brands")
      .select(
        "id, name, responsible, segment, values, keywords, goals, brand_color, avatar_url, created_at, updated_at",
        { count: "exact" },
      )
      .order("name")
      .range(offset, offset + limit - 1);
    if (search) q = q.ilike("name", `%${search}%`);
    const { data, error, count } = await q;
    if (error) return fail("db_error", error.message);
    return ok(
      { items: data ?? [], total: count ?? 0, limit, offset },
      `${data?.length ?? 0} marca(s) encontrada(s).`,
    );
  },
});
