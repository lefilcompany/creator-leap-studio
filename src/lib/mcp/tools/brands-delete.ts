import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fail, ok, requireAuth, supabaseForUser, withAudit } from "../_shared";

export default defineTool({
  name: "brands_delete",
  title: "Excluir marca",
  description:
    "OPERAÇÃO DESTRUTIVA. Exclui permanentemente uma marca. Exige confirm=true. RLS garante que só o dono/equipe pode excluir.",
  inputSchema: {
    id: z.string().uuid(),
    confirm: z.literal(true).describe("Precisa ser explicitamente true para confirmar."),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
  handler: async ({ id, confirm }, ctx) => {
    const uid = requireAuth(ctx);
    if (typeof uid !== "string") return uid;
    if (!confirm) return fail("confirmation_required", "Envie confirm=true para excluir.");
    const supabase = supabaseForUser(ctx);
    const { error, count } = await supabase.from("brands").delete({ count: "exact" }).eq("id", id);
    const result = error
      ? fail("db_error", error.message)
      : (count ?? 0) === 0
        ? fail("not_found", "Marca não encontrada ou sem permissão.")
        : ok({ id, deleted: true }, "Marca excluída.");
    return withAudit(
      ctx,
      { toolName: "brands_delete", action: "delete", resourceType: "brand", resourceId: id },
      result,
    );
  },
});
