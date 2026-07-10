import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fail, ok, requireAuth, supabaseForUser, withAudit } from "../_shared";

export default defineTool({
  name: "brands_update",
  title: "Atualizar marca",
  description: "Atualiza campos editáveis de uma marca. RLS garante que só o dono/equipe pode alterar.",
  inputSchema: {
    id: z.string().uuid(),
    name: z.string().trim().min(1).max(100).optional(),
    responsible: z.string().trim().min(1).max(100).optional(),
    segment: z.string().trim().min(1).max(100).optional(),
    values: z.string().trim().max(2000).optional(),
    keywords: z.string().trim().max(500).optional(),
    goals: z.string().trim().max(2000).optional(),
    promise: z.string().trim().max(1000).optional(),
    brand_color: z.string().trim().max(20).optional(),
    avatar_url: z.string().url().max(500).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ id, ...rest }, ctx) => {
    const uid = requireAuth(ctx);
    if (typeof uid !== "string") return uid;
    const patch = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== undefined));
    if (Object.keys(patch).length === 0)
      return fail("invalid_input", "Envie ao menos um campo para atualizar.");
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("brands")
      .update(patch)
      .eq("id", id)
      .select("id, name")
      .maybeSingle();
    const result = !data && !error
      ? fail("not_found", "Marca não encontrada ou sem permissão.")
      : error
        ? fail("db_error", error.message)
        : ok(data, `Marca atualizada.`);
    return withAudit(
      ctx,
      { toolName: "brands_update", action: "update", resourceType: "brand", resourceId: id, metadata: { fields: Object.keys(patch) } },
      result,
    );
  },
});
