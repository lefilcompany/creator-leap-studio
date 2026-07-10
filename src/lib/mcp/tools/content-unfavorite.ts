import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fail, ok, requireAuth, supabaseForUser, withAudit } from "../_shared";

export default defineTool({
  name: "content_unfavorite",
  title: "Remover dos favoritos",
  description: "Remove um conteúdo dos favoritos do usuário no escopo indicado.",
  inputSchema: {
    action_id: z.string().uuid(),
    scope: z.enum(["me", "team"]).default("me"),
  },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ action_id, scope }, ctx) => {
    const uid = requireAuth(ctx);
    if (typeof uid !== "string") return uid;
    const supabase = supabaseForUser(ctx);
    const { error, count } = await supabase
      .from("action_favorites")
      .delete({ count: "exact" })
      .eq("action_id", action_id)
      .eq("user_id", uid)
      .eq("scope", scope);
    const result = error ? fail("db_error", error.message) : ok({ removed: count ?? 0 }, `${count ?? 0} favorito(s) removido(s).`);
    return withAudit(ctx, { toolName: "content_unfavorite", action: "unfavorite", resourceType: "action", resourceId: action_id, metadata: { scope } }, result);
  },
});
