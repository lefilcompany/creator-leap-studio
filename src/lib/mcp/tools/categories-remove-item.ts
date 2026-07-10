import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fail, ok, requireAuth, supabaseForUser, withAudit } from "../_shared";

export default defineTool({
  name: "categories_remove_item",
  title: "Remover conteúdo de categoria",
  description: "Remove uma action de uma categoria. Requer papel de Dono ou Editor na categoria.",
  inputSchema: { category_id: z.string().uuid(), action_id: z.string().uuid() },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ category_id, action_id }, ctx) => {
    const uid = requireAuth(ctx);
    if (typeof uid !== "string") return uid;
    const supabase = supabaseForUser(ctx);
    const { error, count } = await supabase
      .from("action_category_items")
      .delete({ count: "exact" })
      .eq("category_id", category_id)
      .eq("action_id", action_id);
    const result = error ? fail("db_error", error.message) : ok({ removed: count ?? 0 }, `${count ?? 0} item(ns) removido(s).`);
    return withAudit(ctx, { toolName: "categories_remove_item", action: "remove_item", resourceType: "category", resourceId: category_id, metadata: { action_id } }, result);
  },
});
