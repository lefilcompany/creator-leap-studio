import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabaseClient";
import { withDeepLinks } from "../deepLink";

export default defineTool({
  name: "list_categories",
  title: "Listar categorias",
  description:
    "Lista as categorias de ações às quais o usuário tem acesso (Dono/Editor/Leitor). Categorias organizam entregáveis por tema/projeto dentro de uma marca.",
  inputSchema: {
    limit: z.number().int().min(1).max(100).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("action_categories")
      .select("id, name, description, color, visibility, created_at")
      .order("name")
      .limit(limit ?? 50);
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    const categories = withDeepLinks(data, "category");
    return {
      content: [{ type: "text", text: JSON.stringify(categories, null, 2) }],
      structuredContent: { categories },
    };
  },
});
