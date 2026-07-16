import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabaseClient";
import { withDeepLinks } from "../deepLink";

export default defineTool({
  name: "list_calendar_items",
  title: "Listar itens do calendário",
  description:
    "Lista os itens de um calendário de conteúdo, opcionalmente filtrando por etapa (`calendar`, `briefing`, `design`, `review`, `done`).",
  inputSchema: {
    calendar_id: z.string().uuid().describe("ID do calendário."),
    stage: z
      .enum(["calendar", "briefing", "design", "review", "done"])
      .optional()
      .describe("Etapa do fluxo AEIOU dentro do calendário."),
    limit: z.number().int().min(1).max(100).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ calendar_id, stage, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("calendar_items")
      .select(
        "id, calendar_id, title, theme, scheduled_date, position, stage, calendar_approved, briefing_approved, design_action_id, design_approved, final_approved, created_at",
      )
      .eq("calendar_id", calendar_id)
      .order("position")
      .limit(limit ?? 50);
    if (stage) q = q.eq("stage", stage);
    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    const items = withDeepLinks(data, "calendar_item");
    return {
      content: [{ type: "text", text: JSON.stringify(items, null, 2) }],
      structuredContent: { items },
    };
  },
});
