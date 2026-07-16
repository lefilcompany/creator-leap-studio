import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabaseClient";
import { buildDeepLink } from "../deepLink";

export default defineTool({
  name: "review_image",
  title: "Revisar imagem",
  description:
    "Analisa uma imagem (via URL pública) em relação a uma marca e devolve feedback textual (Gemini Vision). Custa ~2 créditos. Delega para a Edge Function `review-image`.",
  inputSchema: {
    brand_id: z.string().uuid().describe("ID da marca de referência."),
    image_url: z.string().url().describe("URL pública da imagem a analisar."),
    context: z.string().optional().describe("Contexto adicional (briefing, objetivo)."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ brand_id, image_url, context }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase.functions.invoke("review-image", {
      body: { brandId: brand_id, imageUrl: image_url, context },
    });
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    const actionId = data?.actionId ?? data?.action_id;
    const payload = {
      action_id: actionId ?? null,
      feedback: data?.feedback ?? data?.review ?? null,
      credits_used: data?.creditsUsed ?? 2,
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
