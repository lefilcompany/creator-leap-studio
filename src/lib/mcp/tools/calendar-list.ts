import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { PAGINATION_DEFAULT, PAGINATION_MAX, fail, ok, requireAuth, supabaseForUser } from "../_shared";

export default defineTool({
  name: "calendar_list",
  title: "Listar calendários de conteúdo",
  description: "Lista os calendários de conteúdo do usuário, com filtro por marca e status.",
  inputSchema: {
    brand_id: z.string().uuid().optional(),
    status: z.string().max(64).optional(),
    limit: z.number().int().min(1).max(PAGINATION_MAX).default(PAGINATION_DEFAULT),
    offset: z.number().int().min(0).default(0),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ brand_id, status, limit, offset }, ctx) => {
    const uid = requireAuth(ctx);
    if (typeof uid !== "string") return uid;
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("content_calendars")
      .select("id, name, description, brand_id, reference_month, status, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (brand_id) q = q.eq("brand_id", brand_id);
    if (status) q = q.eq("status", status);
    const { data, error, count } = await q;
    if (error) return fail("db_error", error.message);
    return ok({ items: data ?? [], total: count ?? 0, limit, offset }, `${data?.length ?? 0} calendário(s).`);
  },
});
