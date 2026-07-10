import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fail, ok, requireAuth, supabaseForUser, withAudit } from "../_shared";

export default defineTool({
  name: "content_archive",
  title: "Arquivar conteúdo (lixeira)",
  description:
    "Envia o conteúdo para a lixeira (soft-delete via deleted_at). Retenção padrão: 30 dias. Use content_restore para desarquivar.",
  inputSchema: { id: z.string().uuid() },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    const uid = requireAuth(ctx);
    if (typeof uid !== "string") return uid;
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("actions")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id)
      .select("id, deleted_at")
      .maybeSingle();
    const result = error
      ? fail("db_error", error.message)
      : !data
        ? fail("not_found", "Conteúdo não encontrado ou sem permissão.")
        : ok(data, "Conteúdo enviado para a lixeira.");
    return withAudit(ctx, { toolName: "content_archive", action: "archive", resourceType: "action", resourceId: id }, result);
  },
});
