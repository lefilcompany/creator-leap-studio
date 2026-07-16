import { defineTool } from "@lovable.dev/mcp-js";
import { errorResult, notAuthenticated, okResult, supabaseForUser } from "../../_shared/supabase";

export default defineTool({
  name: "get_credit_balance",
  title: "Saldo de créditos",
  description: "Retorna o saldo atual de créditos do usuário.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_i, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const { data, error } = await supabaseForUser(ctx)
      .from("profiles")
      .select("credits, max_credits, credits_expire_at")
      .eq("id", ctx.getUserId())
      .maybeSingle();
    if (error) return errorResult(error.message);
    return okResult(data ?? { credits: 0 }, "balance");
  },
});
