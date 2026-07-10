import { defineTool } from "@lovable.dev/mcp-js";
import { fail, ok, requireAuth, supabaseForUser } from "../_shared";

export default defineTool({
  name: "credits_get",
  title: "Consultar créditos",
  description: "Retorna o saldo de créditos individuais do usuário autenticado.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    const uid = requireAuth(ctx);
    if (typeof uid !== "string") return uid;
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("profiles")
      .select("credits, max_credits, credits_expire_at")
      .eq("id", uid)
      .maybeSingle();
    if (error) return fail("db_error", error.message);
    if (!data) return fail("not_found", "Perfil não encontrado.");
    return ok(
      {
        credits: data.credits ?? 0,
        max_credits: data.max_credits ?? null,
        credits_expire_at: data.credits_expire_at ?? null,
      },
      `Créditos disponíveis: ${data.credits ?? 0}`,
    );
  },
});
