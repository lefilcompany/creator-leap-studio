import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fail, ok, requireAuth, supabaseForUser, withAudit } from "../_shared";

export default defineTool({
  name: "themes_update",
  title: "Atualizar tema estratégico",
  description: "Atualiza campos editáveis de um tema estratégico.",
  inputSchema: {
    id: z.string().uuid(),
    title: z.string().trim().min(1).max(200).optional(),
    description: z.string().trim().max(2000).optional(),
    tone_of_voice: z.string().trim().max(500).optional(),
    target_audience: z.string().trim().max(1000).optional(),
    hashtags: z.string().trim().max(1000).optional(),
    objectives: z.string().trim().max(2000).optional(),
    content_format: z.string().trim().max(500).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ id, ...rest }, ctx) => {
    const uid = requireAuth(ctx);
    if (typeof uid !== "string") return uid;
    const patch = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
    if (Object.keys(patch).length === 0) return fail("invalid_input", "Envie ao menos um campo.");
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase.from("strategic_themes").update(patch).eq("id", id).select("id, title").maybeSingle();
    const result = error
      ? fail("db_error", error.message)
      : !data
        ? fail("not_found", "Tema não encontrado ou sem permissão.")
        : ok(data, "Tema atualizado.");
    return withAudit(ctx, { toolName: "themes_update", action: "update", resourceType: "theme", resourceId: id, metadata: { fields: Object.keys(patch) } }, result);
  },
});
