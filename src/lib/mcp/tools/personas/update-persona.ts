import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, notAuthenticated, okResult, supabaseForUser } from "../../_shared/supabase";

export default defineTool({
  name: "update_persona",
  title: "Atualizar persona",
  description: "Atualiza campos parciais de uma persona.",
  inputSchema: {
    id: z.string().uuid(),
    name: z.string().optional(),
    brand_id: z.string().uuid().optional(),
    age: z.string().optional(),
    gender: z.string().optional(),
    location: z.string().optional(),
    professional_context: z.string().optional(),
    beliefs_and_interests: z.string().optional(),
    content_consumption_routine: z.string().optional(),
    main_goal: z.string().optional(),
    challenges: z.string().optional(),
    preferred_tone_of_voice: z.string().optional(),
    purchase_journey_stage: z.string().optional(),
    interest_triggers: z.string().optional(),
    income_and_purchase_habits: z.string().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ id, ...patch }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(patch)) if (v !== undefined) clean[k] = v;
    if (Object.keys(clean).length === 0) return errorResult("Nada para atualizar.");
    const { data, error } = await supabaseForUser(ctx)
      .from("personas")
      .update(clean)
      .eq("id", id)
      .select()
      .single();
    if (error) return errorResult(error.message);
    return okResult(data, "persona");
  },
});
