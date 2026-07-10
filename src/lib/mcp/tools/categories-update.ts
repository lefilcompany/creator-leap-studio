import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fail, ok, requireAuth, supabaseForUser, withAudit } from "../_shared";

export default defineTool({
  name: "categories_update",
  title: "Atualizar categoria",
  description: "Atualiza nome, descrição, cor ou visibilidade de uma categoria.",
  inputSchema: {
    id: z.string().uuid(),
    name: z.string().trim().min(1).max(100).optional(),
    description: z.string().trim().max(500).optional(),
    color: z.string().trim().max(20).optional(),
    visibility: z.enum(["personal", "team"]).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ id, ...rest }, ctx) => {
    const uid = requireAuth(ctx);
    if (typeof uid !== "string") return uid;
    const patch = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
    if (Object.keys(patch).length === 0) return fail("invalid_input", "Envie ao menos um campo.");
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase.from("action_categories").update(patch).eq("id", id).select("id, name").maybeSingle();
    const result = error
      ? fail("db_error", error.message)
      : !data
        ? fail("not_found", "Categoria não encontrada ou sem permissão.")
        : ok(data, "Categoria atualizada.");
    return withAudit(ctx, { toolName: "categories_update", action: "update", resourceType: "category", resourceId: id, metadata: { fields: Object.keys(patch) } }, result);
  },
});
