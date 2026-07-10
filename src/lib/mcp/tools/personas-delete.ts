import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fail, ok, requireAuth, supabaseForUser, withAudit } from "../_shared";

export default defineTool({
  name: "personas_delete",
  title: "Excluir persona",
  description: "OPERAÇÃO DESTRUTIVA. Exclui permanentemente uma persona. Exige confirm=true.",
  inputSchema: { id: z.string().uuid(), confirm: z.literal(true) },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
  handler: async ({ id, confirm }, ctx) => {
    const uid = requireAuth(ctx);
    if (typeof uid !== "string") return uid;
    if (!confirm) return fail("confirmation_required", "Envie confirm=true para excluir.");
    const supabase = supabaseForUser(ctx);
    const { error, count } = await supabase.from("personas").delete({ count: "exact" }).eq("id", id);
    const result = error
      ? fail("db_error", error.message)
      : (count ?? 0) === 0
        ? fail("not_found", "Persona não encontrada ou sem permissão.")
        : ok({ id, deleted: true }, "Persona excluída.");
    return withAudit(ctx, { toolName: "personas_delete", action: "delete", resourceType: "persona", resourceId: id }, result);
  },
});
