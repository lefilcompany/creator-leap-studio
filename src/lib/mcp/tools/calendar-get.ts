import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fail, ok, requireAuth, supabaseForUser } from "../_shared";

export default defineTool({
  name: "calendar_get",
  title: "Obter calendário de conteúdo",
  description: "Retorna os detalhes de um calendário e seus itens (calendar_items).",
  inputSchema: { id: z.string().uuid() },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    const uid = requireAuth(ctx);
    if (typeof uid !== "string") return uid;
    const supabase = supabaseForUser(ctx);
    const { data: calendar, error: e1 } = await supabase.from("content_calendars").select("*").eq("id", id).maybeSingle();
    if (e1) return fail("db_error", e1.message);
    if (!calendar) return fail("not_found", "Calendário não encontrado ou sem acesso.");
    const { data: items, error: e2 } = await supabase
      .from("calendar_items")
      .select("id, title, theme, scheduled_date, position, stage, calendar_approved, briefing_approved, design_approved, final_approved")
      .eq("calendar_id", id)
      .order("position");
    if (e2) return fail("db_error", e2.message);
    return ok({ calendar, items: items ?? [] }, `Calendário: ${calendar.name} (${items?.length ?? 0} itens).`);
  },
});
