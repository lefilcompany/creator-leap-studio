import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fail, ok, requireAuth, supabaseForUser, withAudit } from "../_shared";

export default defineTool({
  name: "categories_add_item",
  title: "Adicionar conteúdo a categoria",
  description: "Adiciona uma action (conteúdo) a uma categoria. Requer papel de Dono ou Editor na categoria.",
  inputSchema: { category_id: z.string().uuid(), action_id: z.string().uuid() },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ category_id, action_id }, ctx) => {
    const uid = requireAuth(ctx);
    if (typeof uid !== "string") return uid;
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("action_category_items")
      .insert({ category_id, action_id, added_by: uid })
      .select("id")
      .maybeSingle();
    const result = error
      ? error.code === "23505"
        ? ok({ already: true }, "Item já estava na categoria.")
        : fail("db_error", error.message)
      : ok(data, "Item adicionado à categoria.");
    return withAudit(ctx, { toolName: "categories_add_item", action: "add_item", resourceType: "category", resourceId: category_id, metadata: { action_id } }, result);
  },
});
