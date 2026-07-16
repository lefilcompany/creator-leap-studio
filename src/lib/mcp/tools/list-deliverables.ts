import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabaseClient";
import { withDeepLinks } from "../deepLink";

// "Entregáveis" (Deliverables) no vocabulário AEIOU: artefatos produzidos
// pelo Creator (pilar I — Interações) ainda não excluídos.
export default defineTool({
  name: "list_deliverables",
  title: "Listar entregáveis",
  description:
    "Lista os entregáveis recentes do usuário (conteúdos, revisões, planos, vídeos). Corresponde à tabela `actions`. Cada item traz `deep_link` para abrir no Creator.",
  inputSchema: {
    action_type: z
      .string()
      .optional()
      .describe(
        "Filtra por tipo (ex.: 'CRIAR_CONTEUDO', 'CRIAR_CONTEUDO_RAPIDO', 'REVISAR_CONTEUDO', 'PLANEJAR_CONTEUDO', 'GERAR_VIDEO').",
      ),
    brand_id: z.string().uuid().optional().describe("Filtra por marca."),
    limit: z.number().int().min(1).max(50).optional().describe("Padrão 20."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ action_type, brand_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("actions")
      .select("id, action_type, title, brand_id, created_at, status")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit ?? 20);
    if (action_type) q = q.eq("action_type", action_type);
    if (brand_id) q = q.eq("brand_id", brand_id);
    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    const deliverables = withDeepLinks(data, "action");
    return {
      content: [{ type: "text", text: JSON.stringify(deliverables, null, 2) }],
      structuredContent: { deliverables },
    };
  },
});
