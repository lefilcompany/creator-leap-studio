import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabaseClient";

export default defineTool({
  name: "delete_persona",
  title: "Excluir persona",
  description: "Exclui uma persona. Operação destrutiva — confirme com o usuário antes de invocar.",
  inputSchema: { persona_id: z.string().uuid() },
  annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ persona_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { error, count } = await supabase
      .from("personas")
      .delete({ count: "exact" })
      .eq("id", persona_id);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!count) return { content: [{ type: "text", text: "Persona não encontrada ou sem permissão." }], isError: true };
    return {
      content: [{ type: "text", text: `Persona ${persona_id} excluída.` }],
      structuredContent: { deleted: true, persona_id },
    };
  },
});
