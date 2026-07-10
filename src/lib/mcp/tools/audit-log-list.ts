import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { PAGINATION_DEFAULT, PAGINATION_MAX, fail, ok, requireAuth, supabaseForUser } from "../_shared";

export default defineTool({
  name: "audit_log_list",
  title: "Listar log de auditoria",
  description:
    "Lista as entradas de auditoria MCP do usuário autenticado (administradores de sistema veem todos). Registra operações de escrita realizadas via MCP.",
  inputSchema: {
    tool_name: z.string().max(64).optional(),
    resource_type: z.string().max(64).optional(),
    only_errors: z.boolean().default(false),
    limit: z.number().int().min(1).max(PAGINATION_MAX).default(PAGINATION_DEFAULT),
    offset: z.number().int().min(0).default(0),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ tool_name, resource_type, only_errors, limit, offset }, ctx) => {
    const uid = requireAuth(ctx);
    if (typeof uid !== "string") return uid;
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("mcp_audit_log")
      .select("id, user_id, tool_name, action, resource_type, resource_id, success, error_code, error_message, created_at", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);
    if (tool_name) q = q.eq("tool_name", tool_name);
    if (resource_type) q = q.eq("resource_type", resource_type);
    if (only_errors) q = q.eq("success", false);
    const { data, error, count } = await q;
    if (error) return fail("db_error", error.message);
    return ok({ items: data ?? [], total: count ?? 0, limit, offset }, `${data?.length ?? 0} registro(s) de auditoria.`);
  },
});
