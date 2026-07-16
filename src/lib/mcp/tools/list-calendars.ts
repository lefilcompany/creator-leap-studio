import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabaseClient";
import { withDeepLinks } from "../deepLink";

export default defineTool({
  name: "list_calendars",
  title: "Listar calendários de conteúdo",
  description:
    "Lista os calendários de conteúdo do usuário. Cada calendário agrupa itens que percorrem as etapas calendar → briefing → design → review → done.",
  inputSchema: {
    brand_id: z.string().uuid().optional(),
    limit: z.number().int().min(1).max(50).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ brand_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("content_calendars")
      .select("id, name, description, brand_id, persona_id, theme_id, reference_month, status, created_at")
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (brand_id) q = q.eq("brand_id", brand_id);
    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    const calendars = withDeepLinks(data, "calendar");
    return {
      content: [{ type: "text", text: JSON.stringify(calendars, null, 2) }],
      structuredContent: { calendars },
    };
  },
});
