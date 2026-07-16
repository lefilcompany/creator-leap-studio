import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabaseClient";
import { buildDeepLink } from "../deepLink";

export default defineTool({
  name: "create_caption",
  title: "Criar legenda (entregável)",
  description:
    "Gera uma legenda para uma marca e plataforma. Custa ~1 crédito. Delega para a Edge Function `generate-caption`, respeitando compliance e cobrança do usuário. Retorna `action_id` e `deep_link` para materializar como entregável no Ciclo AEIOU.",
  inputSchema: {
    brand_id: z.string().uuid().describe("ID da marca."),
    theme: z.string().optional().describe("Tema/assunto do post."),
    platform: z
      .string()
      .describe("Plataforma alvo: instagram, facebook, linkedin, twitter, tiktok."),
    objective: z.string().describe("Objetivo (ex.: engajamento, venda, autoridade)."),
    image_description: z.string().describe("Descrição da imagem/situação."),
    audience: z.string().optional(),
    tone: z.string().optional(),
    persona: z.string().optional(),
    additional_info: z.string().optional(),
    content_type: z.enum(["organic", "ads"]).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase.functions.invoke("generate-caption", {
      body: {
        brandId: input.brand_id,
        theme: input.theme,
        platform: input.platform,
        objective: input.objective,
        imageDescription: input.image_description,
        audience: input.audience,
        tone: input.tone,
        persona: input.persona,
        additionalInfo: input.additional_info,
        contentType: input.content_type ?? "organic",
        userId: ctx.getUserId(),
      },
    });
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    const actionId = data?.actionId ?? data?.action_id;
    const payload = {
      action_id: actionId ?? null,
      caption: data?.caption ?? data?.text ?? null,
      hashtags: data?.hashtags ?? null,
      credits_used: data?.creditsUsed ?? 1,
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
