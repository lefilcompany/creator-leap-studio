import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabaseClient";

export default defineTool({
  name: "delete_strategic_theme",
  title: "Excluir tema estratégico",
  description: "Exclui um tema estratégico. Operação destrutiva — confirme com o usuário antes de invocar.",
  inputSchema: { theme_id: z.string().uuid() },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ theme_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { error, count } = await supabase
      .from("strategic_themes")
      .delete({ count: "exact" })
      .eq("id", theme_id);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!count) return { content: [{ type: "text", text: "Tema não encontrado ou sem permissão." }], isError: true };
    return {
      content: [{ type: "text", text: `Tema ${theme_id} excluído.` }],
      structuredContent: { deleted: true, theme_id },
    };
  },
});
