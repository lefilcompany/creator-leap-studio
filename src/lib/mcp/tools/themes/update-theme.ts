import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, notAuthenticated, okResult, supabaseForUser } from "../../_shared/supabase";

export default defineTool({
  name: "update_theme",
  title: "Atualizar tema estratégico",
  description: "Atualiza campos parciais de um tema estratégico.",
  inputSchema: {
    id: z.string().uuid(),
    title: z.string().optional(),
    description: z.string().optional(),
    tone_of_voice: z.string().optional(),
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
  handler: async ({ id, ...patch }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patch)) if (v !== undefined) clean[k] = v;
    if (Object.keys(clean).length === 0) return errorResult("Nada para atualizar.");
    const { data, error } = await supabaseForUser(ctx)
      .from("strategic_themes")
      .update(clean)
      .eq("id", id)
      .select()
      .single();
    if (error) return errorResult(error.message);
    return okResult(data, "theme");
  },
});
