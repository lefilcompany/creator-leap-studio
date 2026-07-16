import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabaseClient";
import { buildDeepLink } from "../deepLink";

export default defineTool({
  name: "update_strategic_theme",
  title: "Atualizar tema estratégico",
  description: "Atualiza um tema estratégico existente. Envie apenas os campos a alterar.",
  inputSchema: {
    theme_id: z.string().uuid(),
    title: z.string().optional(),
    description: z.string().optional(),
    color_palette: z.string().optional(),
    tone_of_voice: z.string().optional(),
    target_audience: z.string().optional(),
    hashtags: z.string().optional(),
    objectives: z.string().optional(),
    content_format: z.string().optional(),
    macro_themes: z.string().optional(),
    best_formats: z.string().optional(),
    platforms: z.string().optional(),
    expected_action: z.string().optional(),
    additional_info: z.string().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ theme_id, ...patch }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    if (Object.values(patch).every((v) => v === undefined)) {
      return { content: [{ type: "text", text: "Nenhum campo para atualizar." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("strategic_themes")
      .update(patch)
      .eq("id", theme_id)
      .select("id, title, description, brand_id, target_audience, updated_at")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Tema não encontrado ou sem permissão." }], isError: true };
    const theme = { ...data, deep_link: buildDeepLink("theme", data.id) };
    return {
      content: [{ type: "text", text: JSON.stringify(theme, null, 2) }],
      structuredContent: { theme },
    };
  },
});
