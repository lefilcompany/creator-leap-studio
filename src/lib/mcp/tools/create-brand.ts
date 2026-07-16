import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabaseClient";
import { buildDeepLink } from "../deepLink";

export default defineTool({
  name: "create_brand",
  title: "Criar marca",
  description:
    "Cria uma nova marca (brand) para o usuário autenticado. Preencha os campos de identidade — apenas `name`, `responsible` e `segment` são obrigatórios; os demais enriquecem o briefing e melhoram entregáveis. Retorna o registro criado com `deep_link` para o Creator.",
  inputSchema: {
    name: z.string().min(1).max(120),
    responsible: z.string().min(1).describe("Pessoa/área responsável pela marca."),
    segment: z.string().min(1).describe("Segmento/nicho da marca."),
    values: z.string().optional(),
    keywords: z.string().optional(),
    goals: z.string().optional(),
    promise: z.string().optional(),
    restrictions: z.string().optional(),
    inspirations: z.string().optional(),
    success_metrics: z.string().optional(),
    brand_references: z.string().optional(),
    special_dates: z.string().optional(),
    crisis_info: z.string().optional(),
    milestones: z.string().optional(),
    collaborations: z.string().optional(),
    brand_color: z.string().optional().describe("Cor primária em hex, ex: #FF6600."),
    avatar_url: z.string().url().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    try {
      const userId = ctx.getUserId();
      const { data: profile } = await supabase
        .from("profiles")
        .select("team_id, current_workspace_id")
        .eq("id", userId)
        .maybeSingle();
      const { data, error } = await supabase
        .from("brands")
        .insert({
          ...input,
          user_id: userId,
          team_id: profile?.team_id ?? null,
          workspace_id: profile?.current_workspace_id ?? null,
        })
        .select("id, name, segment, brand_color, avatar_url, created_at")
        .single();
      if (error) return { content: [{ type: "text", text: error.message }], isError: true };
      const brand = { ...data, deep_link: buildDeepLink("brand", data.id) };
      return {
        content: [{ type: "text", text: JSON.stringify(brand, null, 2) }],
        structuredContent: { brand },
      };
    } catch (e) {
      return { content: [{ type: "text", text: (e as Error).message }], isError: true };
    }
  },
});
