import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";

function supabaseForUser(ctx: ToolContext) {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export default defineTool({
  name: "get_credits",
  title: "Consultar créditos",
  description:
    "Retorna o saldo de créditos individuais do usuário autenticado no Creator.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return {
        content: [{ type: "text", text: "Não autenticado." }],
        isError: true,
      };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("profiles")
      .select("credits, max_credits, credits_expire_at")
      .eq("id", ctx.getUserId())
      .maybeSingle();

    if (error) {
      return {
        content: [{ type: "text", text: error.message }],
        isError: true,
      };
    }
    if (!data) {
      return {
        content: [{ type: "text", text: "Perfil não encontrado." }],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: "text",
          text: `Créditos disponíveis: ${data.credits ?? 0}` +
            (data.max_credits ? ` (limite: ${data.max_credits})` : "") +
            (data.credits_expire_at
              ? ` — expira em ${data.credits_expire_at}`
              : ""),
        },
      ],
      structuredContent: {
        credits: data.credits ?? 0,
        max_credits: data.max_credits ?? null,
        credits_expire_at: data.credits_expire_at ?? null,
      },
    };
  },
});
