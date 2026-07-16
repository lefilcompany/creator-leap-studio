import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabaseClient";
import { buildDeepLink } from "../deepLink";

export default defineTool({
  name: "get_strategic_theme",
  title: "Detalhar tema estratégico",
  description: "Retorna todos os campos de um tema estratégico.",
  inputSchema: { theme_id: z.string().uuid() },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ theme_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("strategic_themes")
      .select("*")
      .eq("id", theme_id)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Tema não encontrado." }], isError: true };
    const theme = { ...data, deep_link: buildDeepLink("theme", data.id) };
    return {
      content: [{ type: "text", text: JSON.stringify(theme, null, 2) }],
      structuredContent: { theme },
    };
  },
});
