import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabaseClient";
import { getAuthUserId } from "../authUser";
import { buildDeepLink } from "../deepLink";

export default defineTool({
  name: "create_strategic_theme",
  title: "Criar tema estratégico",
  description:
    "Cria um tema estratégico vinculado a uma marca. Os campos textuais são obrigatórios porque estruturam o briefing usado por captions/imagens/planos. Envie 'a definir' em campos que ainda não estejam claros.",
  inputSchema: {
    brand_id: z.string().uuid(),
    title: z.string().min(1),
    description: z.string().min(1),
    color_palette: z.string().min(1).describe("Descrição textual da paleta, ex: 'tons quentes: laranja, vermelho'."),
    tone_of_voice: z.string().min(1),
    target_audience: z.string().min(1),
    hashtags: z.string().min(1),
    objectives: z.string().min(1),
    content_format: z.string().min(1),
    macro_themes: z.string().min(1),
    best_formats: z.string().min(1),
    platforms: z.string().min(1),
    expected_action: z.string().min(1),
    additional_info: z.string().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    try {
      const userId = await getAuthUserId(supabase);
      const { data: profile } = await supabase
        .from("profiles")
        .select("team_id")
        .eq("id", userId)
        .maybeSingle();
      const { data, error } = await supabase
        .from("strategic_themes")
        .insert({ ...input, user_id: userId, team_id: profile?.team_id ?? null })
        .select("id, title, description, brand_id, target_audience, created_at")
        .single();
      if (error) return { content: [{ type: "text", text: error.message }], isError: true };
      const theme = { ...data, deep_link: buildDeepLink("theme", data.id) };
      return {
        content: [{ type: "text", text: JSON.stringify(theme, null, 2) }],
        structuredContent: { theme },
      };
    } catch (e) {
      return { content: [{ type: "text", text: (e as Error).message }], isError: true };
    }
  },
});
