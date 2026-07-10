import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fail, ok, requireAuth, supabaseForUser, withAudit } from "../_shared";

export default defineTool({
  name: "notifications_mark_read",
  title: "Marcar notificação como lida",
  description: "Marca uma notificação como lida.",
  inputSchema: { id: z.string().uuid() },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    const uid = requireAuth(ctx);
    if (typeof uid !== "string") return uid;
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", id)
      .eq("user_id", uid)
      .select("id, read")
      .maybeSingle();
    const result = error
      ? fail("db_error", error.message)
      : !data
        ? fail("not_found", "Notificação não encontrada.")
        : ok(data, "Notificação marcada como lida.");
    return withAudit(ctx, { toolName: "notifications_mark_read", action: "mark_read", resourceType: "notification", resourceId: id }, result);
  },
});
