import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabaseClient";
import { buildDeepLink } from "../deepLink";

export default defineTool({
  name: "update_persona",
  title: "Atualizar persona",
  description: "Atualiza uma persona existente. Envie apenas os campos que deseja alterar.",
  inputSchema: {
    persona_id: z.string().uuid(),
    name: z.string().optional(),
    gender: z.string().optional(),
    age: z.string().optional(),
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
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ persona_id, ...patch }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    if (Object.values(patch).every((v) => v === undefined)) {
      return { content: [{ type: "text", text: "Nenhum campo para atualizar." }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("personas")
      .update(patch)
      .eq("id", persona_id)
      .select("id, name, gender, age, location, brand_id, updated_at")
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!data) return { content: [{ type: "text", text: "Persona não encontrada ou sem permissão." }], isError: true };
    const persona = { ...data, deep_link: buildDeepLink("persona", data.id) };
    return {
      content: [{ type: "text", text: JSON.stringify(persona, null, 2) }],
      structuredContent: { persona },
    };
  },
});
