import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fail, ok, requireAuth, supabaseForUser, withAudit } from "../_shared";

export default defineTool({
  name: "themes_delete",
  title: "Excluir tema estratégico",
  description: "OPERAÇÃO DESTRUTIVA. Exclui permanentemente um tema estratégico. Exige confirm=true.",
  inputSchema: { id: z.string().uuid(), confirm: z.literal(true) },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
  handler: async ({ id, confirm }, ctx) => {
    const uid = requireAuth(ctx);
    if (typeof uid !== "string") return uid;
    if (!confirm) return fail("confirmation_required", "Envie confirm=true para excluir.");
    const supabase = supabaseForUser(ctx);
    const { error, count } = await supabase.from("strategic_themes").delete({ count: "exact" }).eq("id", id);
    const result = error
      ? fail("db_error", error.message)
      : (count ?? 0) === 0
        ? fail("not_found", "Tema não encontrado ou sem permissão.")
        : ok({ id, deleted: true }, "Tema excluído.");
    return withAudit(ctx, { toolName: "themes_delete", action: "delete", resourceType: "theme", resourceId: id }, result);
  },
});
