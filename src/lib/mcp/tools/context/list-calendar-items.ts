import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, notAuthenticated, okResult, supabaseForUser } from "../../_shared/supabase";

export default defineTool({
  name: "list_calendar_items",
  title: "Listar itens de um calendário",
  description: "Lista os itens de um calendário de conteúdo (título, tema, data agendada, estágio).",
  inputSchema: {
    calendar_id: z.string().uuid(),
    limit: z.number().int().min(1).max(200).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ calendar_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const { data, error } = await supabaseForUser(ctx)
      .from("calendar_items")
      .select(
        "id, title, theme, scheduled_date, position, stage, calendar_approved, briefing_approved",
      )
      .eq("calendar_id", calendar_id)
      .order("position", { ascending: true })
      .limit(limit ?? 100);
    if (error) return errorResult(error.message);
    return okResult(data ?? [], "items");
  },
});
