import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabaseClient";
import { buildDeepLink } from "../deepLink";

export default defineTool({
  name: "create_content_plan",
  title: "Criar plano de conteúdo",
  description:
    "Gera um planejamento de conteúdo (Calendário) para uma marca a partir de temas e plataformas. Custa ~5 créditos. Delega para a Edge Function `generate-plan`. Retorna um entregável (`action_id`) com o plano em markdown.",
  inputSchema: {
    brand: z.string().describe("Nome da marca."),
    themes: z.array(z.string()).min(1).max(10).describe("Lista de temas estratégicos."),
    platforms: z
      .array(z.enum(["instagram", "linkedin", "facebook", "twitter", "tiktok"]))
      .min(1)
      .describe("Plataformas alvo."),
    quantity: z.number().int().min(1).max(30).optional().describe("Quantidade de posts."),
    objective: z.string().optional(),
    additional_info: z.string().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase.functions.invoke("generate-plan", {
      body: {
        brand: input.brand,
        themes: input.themes,
        platforms: input.platforms,
        quantity: input.quantity ?? 5,
        objective: input.objective,
        additionalInfo: input.additional_info,
        userId: ctx.getUserId(),
      },
    });
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    const actionId = data?.actionId ?? data?.action_id;
    const payload = {
      action_id: actionId ?? null,
      plan_markdown: data?.plan ?? data?.plan_markdown ?? null,
      credits_used: data?.creditsUsed ?? 5,
      credits_remaining: data?.creditsRemaining ?? null,
      deep_link: actionId ? buildDeepLink("action", actionId) : null,
      raw: data,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
