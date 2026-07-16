import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, notAuthenticated, okResult, supabaseForUser } from "../../_shared/supabase";

export default defineTool({
  name: "create_theme",
  title: "Criar tema estratégico",
  description: "Cria um tema/editoria associado a uma marca.",
  inputSchema: {
    title: z.string().min(1).describe("Título do tema/editoria."),
    brand_id: z.string().uuid().describe("Marca associada."),
    description: z.string().optional(),
    tone_of_voice: z.string().optional().describe("Ex.: 'Inspirador; Profissional'."),
    target_audience: z.string().optional(),
    objectives: z.string().optional(),
    macro_themes: z.string().optional(),
    best_formats: z.string().optional(),
    platforms: z.string().optional(),
    hashtags: z.string().optional(),
    expected_action: z.string().optional(),
    color_palette: z.string().optional(),
    additional_info: z.string().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const userId = ctx.getUserId();
    const { data: profile } = await supabase
      .from("profiles")
      .select("team_id, current_workspace_id")
      .eq("id", userId)
      .maybeSingle();
    const { data, error } = await supabase
      .from("strategic_themes")
      .insert({
        user_id: userId,
        team_id: profile?.team_id ?? null,
        workspace_id: profile?.current_workspace_id ?? null,
        ...input,
      })
      .select()
      .single();
    if (error) return errorResult(error.message);
    return okResult(data, "theme");
  },
});
