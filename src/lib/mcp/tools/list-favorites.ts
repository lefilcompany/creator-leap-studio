import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabaseClient";
import { buildDeepLink } from "../deepLink";

export default defineTool({
  name: "list_favorites",
  title: "Listar favoritos",
  description:
    "Lista os entregáveis favoritados pelo usuário. `scope='me'` traz favoritos pessoais; `scope='team'` traz favoritos compartilhados com a equipe. Úteis como referência de estilo para o orquestrador antes de gerar novos conteúdos.",
  inputSchema: {
    scope: z.enum(["me", "team"]).optional().describe("Escopo do favorito. Padrão 'me'."),
    limit: z.number().int().min(1).max(50).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ scope, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("action_favorites")
      .select("id, action_id, scope, created_at")
      .eq("scope", scope ?? "me")
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    const favorites = (data ?? []).map((f) => ({
      ...f,
      deep_link: buildDeepLink("action", f.action_id),
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(favorites, null, 2) }],
      structuredContent: { favorites },
    };
  },
});
