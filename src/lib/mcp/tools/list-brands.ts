import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";

function supabaseForUser(ctx: ToolContext) {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY!,
    {
      global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    },
  );
}

export default defineTool({
  name: "list_brands",
  title: "Listar marcas",
  description:
    "Lista as marcas às quais o usuário autenticado tem acesso no Creator (via RLS).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return {
        content: [{ type: "text", text: "Não autenticado." }],
        isError: true,
      };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("brands")
      .select("id, name, description, tone_of_voice, created_at")
      .order("name")
      .limit(100);

    if (error) {
      return {
        content: [{ type: "text", text: error.message }],
        isError: true,
      };
    }

    const items = data ?? [];
    const summary = items.length === 0
      ? "Nenhuma marca encontrada."
      : items.map((b) => `• ${b.name}${b.description ? ` — ${b.description}` : ""}`).join("\n");

    return {
      content: [{ type: "text", text: summary }],
      structuredContent: { brands: items },
    };
  },
});
