import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, notAuthenticated, okResult, supabaseForUser } from "../../_shared/supabase";

export default defineTool({
  name: "get_brand",
  title: "Obter marca",
  description: "Retorna os dados completos de uma marca pelo id.",
  inputSchema: {
    id: z.string().uuid().describe("ID da marca."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const { data, error } = await supabaseForUser(ctx)
      .from("brands")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) return errorResult(error.message);
    if (!data) return errorResult("Marca não encontrada.");
    return okResult(data, "brand");
  },
});
