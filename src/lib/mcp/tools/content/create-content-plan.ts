import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, notAuthenticated, okResult, supabaseForUser } from "../../_shared/supabase";

export default defineTool({
  name: "create_content_plan",
  title: "Criar calendário de conteúdo",
  description:
    "Cria um calendário de conteúdo (planejamento) para uma marca, com quantidade, plataformas e objetivo.",
  inputSchema: {
    brand_id: z.string().uuid().describe("Marca do planejamento."),
    quantity: z.number().int().min(1).max(60).describe("Quantidade de peças a planejar."),
    objective: z.string().min(1).describe("Objetivo do planejamento."),
    themes: z.array(z.string()).optional().describe("Temas/editorias a distribuir."),
    platforms: z.array(z.string()).optional().describe("Plataformas alvo (ex.: instagram, linkedin)."),
    platform: z.string().optional().describe("Plataforma única (retrocompat.)."),
    additional_info: z.string().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId();
    const { data: profile } = await supabase
      .from("profiles")
      .select("team_id")
      .eq("id", userId)
      .maybeSingle();
    const { data: brand } = await supabase
      .from("brands")
      .select("*")
      .eq("id", input.brand_id)
      .maybeSingle();
    const { data, error } = await supabase.functions.invoke("generate-plan", {
      body: {
        brand,
        themes: input.themes ?? [],
        platform: input.platform,
        platforms: input.platforms,
        quantity: input.quantity,
        objective: input.objective,
        additionalInfo: input.additional_info,
        userId,
        teamId: profile?.team_id ?? null,
      },
    });
    if (error) return errorResult(error.message);
    return okResult(data, "plan");
  },
});
