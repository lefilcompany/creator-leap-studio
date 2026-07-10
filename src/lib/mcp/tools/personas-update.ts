import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fail, ok, requireAuth, supabaseForUser, withAudit } from "../_shared";

export default defineTool({
  name: "personas_update",
  title: "Atualizar persona",
  description: "Atualiza campos editáveis de uma persona.",
  inputSchema: {
    id: z.string().uuid(),
    name: z.string().trim().min(1).max(100).optional(),
    gender: z.string().trim().max(50).optional(),
    age: z.string().trim().max(50).optional(),
    location: z.string().trim().max(200).optional(),
    professional_context: z.string().trim().max(2000).optional(),
    beliefs_and_interests: z.string().trim().max(2000).optional(),
    main_goal: z.string().trim().max(2000).optional(),
    challenges: z.string().trim().max(2000).optional(),
    preferred_tone_of_voice: z.string().trim().max(500).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ id, ...rest }, ctx) => {
    const uid = requireAuth(ctx);
    if (typeof uid !== "string") return uid;
    const patch = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
    if (Object.keys(patch).length === 0) return fail("invalid_input", "Envie ao menos um campo.");
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase.from("personas").update(patch).eq("id", id).select("id, name").maybeSingle();
    const result = error
      ? fail("db_error", error.message)
      : !data
        ? fail("not_found", "Persona não encontrada ou sem permissão.")
        : ok(data, "Persona atualizada.");
    return withAudit(ctx, { toolName: "personas_update", action: "update", resourceType: "persona", resourceId: id, metadata: { fields: Object.keys(patch) } }, result);
  },
});
