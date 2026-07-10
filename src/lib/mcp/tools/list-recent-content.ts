import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

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
  name: "list_recent_content",
  title: "Listar conteúdos recentes",
  description:
    "Lista os conteúdos gerados mais recentes do usuário autenticado no Creator (imagens, vídeos, textos). RLS já limita a resultados que o usuário pode ver.",
  inputSchema: {
    limit: z
      .number()
      .int()
      .min(1)
      .max(50)
      .default(10)
      .describe("Número máximo de itens a retornar (1–50). Padrão: 10."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return {
        content: [{ type: "text", text: "Não autenticado." }],
        isError: true,
      };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("actions")
      .select("id, type, status, created_at, brands(name)")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return {
        content: [{ type: "text", text: error.message }],
        isError: true,
      };
    }

    const items = data ?? [];
    const summary = items.length === 0
      ? "Nenhum conteúdo recente encontrado."
      : items
          .map((a) => {
            const brandName = Array.isArray(a.brands)
              ? a.brands[0]?.name
              : (a.brands as { name?: string } | null)?.name;
            return `• [${a.type}] ${brandName ?? "—"} · ${a.status} · ${a.created_at}`;
          })
          .join("\n");

    return {
      content: [{ type: "text", text: summary }],
      structuredContent: { items },
    };
  },
});
