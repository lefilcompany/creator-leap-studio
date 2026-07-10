import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fail, ok, requireAuth, supabaseForUser, withAudit } from "../_shared";

export default defineTool({
  name: "categories_delete",
  title: "Excluir categoria",
  description: "OPERAÇÃO DESTRUTIVA. Exclui uma categoria. Exige confirm=true.",
  inputSchema: { id: z.string().uuid(), confirm: z.literal(true) },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
  handler: async ({ id, confirm }, ctx) => {
    const uid = requireAuth(ctx);
    if (typeof uid !== "string") return uid;
    if (!confirm) return fail("confirmation_required", "Envie confirm=true.");
    const supabase = supabaseForUser(ctx);
    const { error, count } = await supabase.from("action_categories").delete({ count: "exact" }).eq("id", id);
    const result = error
      ? fail("db_error", error.message)
      : (count ?? 0) === 0
        ? fail("not_found", "Categoria não encontrada ou sem permissão.")
        : ok({ id, deleted: true }, "Categoria excluída.");
    return withAudit(ctx, { toolName: "categories_delete", action: "delete", resourceType: "category", resourceId: id }, result);
  },
});
