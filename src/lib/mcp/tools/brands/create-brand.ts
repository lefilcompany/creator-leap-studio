import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, notAuthenticated, okResult, supabaseForUser } from "../../_shared/supabase";

export default defineTool({
  name: "create_brand",
  title: "Cadastrar marca",
  description:
    "Cria uma nova marca no Creator. Alinhado ao formulário de cadastro do roteiro: nome, segmento, valores, indicadores de sucesso, restrições e URL do logo são obrigatórios.",
  inputSchema: {
    name: z.string().min(1).describe("Nome oficial ou comercial da marca."),
    segment: z.string().min(1).describe("Segmento ou mercado de atuação."),
    values: z.string().min(1).describe("Valores que orientam a marca."),
    success_metrics: z.string().min(1).describe("Indicadores usados para avaliar sucesso."),
    restrictions: z.string().min(1).describe("O que nunca deve aparecer na comunicação."),
    logo_url: z.string().url().describe("URL pública do logo principal (PNG/SVG/PDF)."),
    responsible: z.string().optional().describe("Nome do responsável pela marca (default: nome do usuário)."),
    keywords: z.string().optional().describe("Palavras-chave que representam a marca."),
    inspirations: z.string().optional().describe("Marcas/perfis de referência e o que se admira."),
    special_dates: z.string().optional().describe("Datas ou períodos importantes para o negócio."),
    brand_references: z.string().optional().describe("Conteúdos de referência (links, campanhas, estilo)."),
    goals: z.string().optional().describe("Objetivos de negócio ou comunicação."),
    promise: z.string().optional().describe("Promessa da marca."),
    brand_color: z.string().optional().describe("Cor principal em hex (#RRGGBB)."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId();

    const { data: profile } = await supabase
      .from("profiles")
      .select("name, team_id, current_workspace_id")
      .eq("id", userId)
      .maybeSingle();

    const { data, error } = await supabase
      .from("brands")
      .insert({
        user_id: userId,
        team_id: profile?.team_id ?? null,
        workspace_id: profile?.current_workspace_id ?? null,
        name: input.name,
        segment: input.segment,
        values: input.values,
        success_metrics: input.success_metrics,
        restrictions: input.restrictions,
        logo: { url: input.logo_url },
        responsible: input.responsible ?? profile?.name ?? "—",
        keywords: input.keywords ?? null,
        inspirations: input.inspirations ?? null,
        special_dates: input.special_dates ?? null,
        brand_references: input.brand_references ?? null,
        goals: input.goals ?? null,
        promise: input.promise ?? null,
        brand_color: input.brand_color ?? null,
      })
      .select()
      .single();
    if (error) return errorResult(error.message);
    return okResult(data, "brand");
  },
});
