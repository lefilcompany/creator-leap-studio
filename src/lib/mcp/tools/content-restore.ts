import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fail, ok, requireAuth, supabaseForUser, withAudit } from "../_shared";

export default defineTool({
  name: "content_restore",
  title: "Restaurar conteúdo da lixeira",
  description: "Restaura um conteúdo arquivado (limpa deleted_at).",
  inputSchema: { id: z.string().uuid() },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    const uid = requireAuth(ctx);
    if (typeof uid !== "string") return uid;
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase.from("actions").update({ deleted_at: null }).eq("id", id).select("id, deleted_at").maybeSingle();
    const result = error
      ? fail("db_error", error.message)
      : !data
        ? fail("not_found", "Conteúdo não encontrado ou sem permissão.")
        : ok(data, "Conteúdo restaurado.");
    return withAudit(ctx, { toolName: "content_restore", action: "restore", resourceType: "action", resourceId: id }, result);
  },
});
