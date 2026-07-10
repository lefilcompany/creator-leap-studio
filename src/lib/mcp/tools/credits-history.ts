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
  name: "credits_history",
  title: "Histórico de créditos",
  description:
    "Lista os lançamentos de consumo/adição de créditos do usuário autenticado, com paginação.",
  inputSchema: {
    limit: z.number().int().min(1).max(PAGINATION_MAX).default(PAGINATION_DEFAULT),
    offset: z.number().int().min(0).default(0),
    action_type: z.string().max(64).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit, offset, action_type }, ctx) => {
    const uid = requireAuth(ctx);
    if (typeof uid !== "string") return uid;
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("credit_history")
      .select(
        "id, action_type, credits_used, credits_before, credits_after, description, created_at",
        { count: "exact" },
      )
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (action_type) q = q.eq("action_type", action_type);
    const { data, error, count } = await q;
    if (error) return fail("db_error", error.message);
    return ok(
      { items: data ?? [], total: count ?? 0, limit, offset },
      `${data?.length ?? 0} lançamento(s).`,
    );
  },
});
