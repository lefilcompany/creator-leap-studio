import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, notAuthenticated, okResult, supabaseForUser } from "../../_shared/supabase";

export default defineTool({
  name: "create_persona",
  title: "Criar persona",
  description: "Cria uma persona associada opcionalmente a uma marca.",
  inputSchema: {
    name: z.string().min(1).describe("Nome da persona (ex.: 'Empreendedora Beleza 25-34')."),
    brand_id: z.string().uuid().optional().describe("Marca associada."),
    age: z.string().optional(),
    gender: z.string().optional(),
    location: z.string().optional(),
    professional_context: z.string().optional(),
    beliefs_and_interests: z.string().optional(),
    content_consumption_routine: z.string().optional(),
    main_goal: z.string().optional().describe("Principal objetivo/desejo."),
    challenges: z.string().optional().describe("Dores/desafios."),
    preferred_tone_of_voice: z.string().optional(),
    purchase_journey_stage: z.string().optional(),
    interest_triggers: z.string().optional(),
    income_and_purchase_habits: z.string().optional(),
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
      .from("personas")
      .insert({
        user_id: userId,
        team_id: profile?.team_id ?? null,
        workspace_id: profile?.current_workspace_id ?? null,
        ...input,
      })
      .select()
      .single();
    if (error) return errorResult(error.message);
    return okResult(data, "persona");
  },
});
