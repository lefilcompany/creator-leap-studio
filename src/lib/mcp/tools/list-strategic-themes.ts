import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabaseClient";
import { withDeepLinks } from "../deepLink";

export default defineTool({
  name: "list_strategic_themes",
  title: "Listar temas estratégicos",
  description:
    "Lista os temas estratégicos do usuário. Filtra opcionalmente por marca. Cada item traz `deep_link` para o Creator.",
  inputSchema: {
    brand_id: z.string().uuid().optional(),
    limit: z.number().int().min(1).max(100).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ brand_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("strategic_themes")
      .select("id, title, description, brand_id, target_audience, created_at")
      .order("title")
      .limit(limit ?? 50);
    if (brand_id) q = q.eq("brand_id", brand_id);
    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    const themes = withDeepLinks(data, "theme");
    return {
      content: [{ type: "text", text: JSON.stringify(themes, null, 2) }],
      structuredContent: { themes },
    };
  },
});
