import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabaseClient";
import { buildDeepLink } from "../deepLink";

export default defineTool({
  name: "get_persona",
  title: "Detalhar persona",
  description: "Retorna todos os campos de uma persona. Útil para o Shell montar briefings ricos antes de gerar entregáveis.",
  inputSchema: { persona_id: z.string().uuid() },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ persona_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("personas")
      .select("*")
      .eq("id", persona_id)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Persona não encontrada." }], isError: true };
    const persona = { ...data, deep_link: buildDeepLink("persona", data.id) };
    return {
      content: [{ type: "text", text: JSON.stringify(persona, null, 2) }],
      structuredContent: { persona },
    };
  },
});
