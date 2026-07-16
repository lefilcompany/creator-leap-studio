import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabaseClient";

export default defineTool({
  name: "delete_brand",
  title: "Excluir marca",
  description:
    "Exclui definitivamente uma marca (e por cascade suas personas, temas, templates e entregáveis). Operação destrutiva — confirme com o usuário antes de invocar.",
  inputSchema: { brand_id: z.string().uuid() },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ brand_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { error, count } = await supabase
      .from("brands")
      .delete({ count: "exact" })
      .eq("id", brand_id);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!count) return { content: [{ type: "text", text: "Marca não encontrada ou sem permissão." }], isError: true };
    return {
      content: [{ type: "text", text: `Marca ${brand_id} excluída.` }],
      structuredContent: { deleted: true, brand_id },
    };
  },
});
