import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabaseClient";
import { buildDeepLink } from "../deepLink";

export default defineTool({
  name: "create_image",
  title: "Criar imagem (entregável)",
  description:
    "Gera uma imagem para uma marca via Gemini. Custa ~8 créditos. ATENÇÃO: entrega a imagem crua — o overlay de texto (headline/CTA) só é aplicado quando o usuário abre o Creator no navegador (Canvas 2D). O campo `overlay_status='pending'` indica que o entregável ainda precisa ser finalizado no app.",
  inputSchema: {
    brand_id: z.string().uuid().describe("ID da marca."),
    description: z.string().describe("Descrição/briefing visual do que gerar."),
    platform: z
      .string()
      .optional()
      .describe("Plataforma alvo (define aspect ratio). Opcional se `aspect_ratio` for informado."),
    aspect_ratio: z.string().optional().describe("Ex.: '1:1', '9:16', '16:9'."),
    persona_id: z.string().uuid().optional(),
    theme_id: z.string().uuid().optional(),
    additional_info: z.string().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase.functions.invoke("generate-image", {
      body: {
        brandId: input.brand_id,
        description: input.description,
        platform: input.platform,
        aspectRatio: input.aspect_ratio,
        personaId: input.persona_id,
        themeId: input.theme_id,
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
      image_url: data?.imageUrl ?? data?.image_url ?? null,
      overlay_status: data?.overlayStatus ?? data?.overlay_status ?? "pending",
      overlay_note:
        "O overlay de texto (headline/CTA) é aplicado no navegador quando o usuário abre a ação no Creator. Via MCP, a imagem entregue não contém o texto queimado.",
      credits_used: data?.creditsUsed ?? 8,
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
