import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabaseClient";
import { buildDeepLink } from "../deepLink";

export default defineTool({
  name: "review_caption",
  title: "Revisar legenda",
  description:
    "Analisa uma legenda em relação a uma marca e retorna feedback textual (fortalezas, ajustes, riscos). Custa ~1 crédito. Delega para a Edge Function `review-caption`.",
  inputSchema: {
    brand_id: z.string().uuid().describe("ID da marca de referência."),
    caption: z.string().describe("Texto da legenda a ser revisada."),
    prompt: z.string().optional().describe("Prompt/briefing original, se houver."),
    theme_name: z.string().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ brand_id, caption, prompt, theme_name }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase.functions.invoke("review-caption", {
      body: { brandId: brand_id, caption, prompt, themeName: theme_name },
    });
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    const actionId = data?.actionId ?? data?.action_id;
    const payload = {
      action_id: actionId ?? null,
      feedback: data?.feedback ?? data?.review ?? null,
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
