import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabaseClient";
import { buildDeepLink } from "../deepLink";

export default defineTool({
  name: "get_brand",
  title: "Detalhar marca",
  description:
    "Retorna dados completos de uma marca (identidade visual, valores, restrições, moodboard) e o resumo de estilo aprendido a partir do feedback (`brand_style_preferences`). Use antes de criar entregáveis (caption/imagem) para o orquestrador montar briefings coerentes.",
  inputSchema: {
    brand_id: z.string().uuid().describe("ID da marca."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ brand_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data: brand, error } = await supabase
      .from("brands")
      .select(
        "id, name, segment, responsible, values, keywords, goals, promise, restrictions, brand_color, avatar_url, moodboard, color_palette, brand_references, created_at",
      )
      .eq("id", brand_id)
      .maybeSingle();
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    if (!brand) {
      return { content: [{ type: "text", text: "Marca não encontrada ou sem acesso." }], isError: true };
    }
    const { data: stylePrefs } = await supabase
      .from("brand_style_preferences")
      .select("style_summary, total_positive, total_negative, last_updated_from_feedback_at")
      .eq("brand_id", brand_id)
      .maybeSingle();

    const payload = {
      brand: { ...brand, deep_link: buildDeepLink("brand", brand.id) },
      style_preferences: stylePrefs ?? null,
    };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
