import { defineTool } from "@lovable.dev/mcp-js";
import { fail, ok, requireAuth, supabaseForUser, withAudit } from "../_shared";

export default defineTool({
  name: "notifications_mark_all_read",
  title: "Marcar todas as notificações como lidas",
  description: "Marca todas as notificações não lidas do usuário autenticado como lidas.",
  inputSchema: {},
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    const uid = requireAuth(ctx);
    if (typeof uid !== "string") return uid;
    const supabase = supabaseForUser(ctx);
    const { error, count } = await supabase
      .from("notifications")
      .update({ read: true }, { count: "exact" })
      .eq("user_id", uid)
      .eq("read", false);
    const result = error ? fail("db_error", error.message) : ok({ updated: count ?? 0 }, `${count ?? 0} marcada(s) como lida(s).`);
    return withAudit(ctx, { toolName: "notifications_mark_all_read", action: "mark_all_read", resourceType: "notification" }, result);
  },
});
