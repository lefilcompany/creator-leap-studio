import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fail, ok, requireAuth, supabaseForUser, withAudit } from "../_shared";

export default defineTool({
  name: "profile_update",
  title: "Atualizar perfil",
  description:
    "Atualiza campos do perfil do usuário autenticado (nome, telefone, cidade, estado, avatar). Não permite alterar email, créditos, plano ou papel.",
  inputSchema: {
    name: z.string().trim().min(1).max(100).optional(),
    phone: z.string().trim().max(30).optional(),
    city: z.string().trim().max(100).optional(),
    state: z.string().trim().max(50).optional(),
    avatar_url: z.string().url().max(500).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    const uid = requireAuth(ctx);
    if (typeof uid !== "string") return uid;
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input)) if (v !== undefined) patch[k] = v;
    if (Object.keys(patch).length === 0)
      return fail("invalid_input", "Envie ao menos um campo para atualizar.");
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", uid)
      .select("id, name, phone, city, state, avatar_url")
      .maybeSingle();
    const result = error
      ? fail("db_error", error.message)
      : ok(data, "Perfil atualizado.");
    return withAudit(
      ctx,
      { toolName: "profile_update", action: "update", resourceType: "profile", resourceId: uid, metadata: { fields: Object.keys(patch) } },
      result,
    );
  },
});
