import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabaseClient";
import { buildDeepLink } from "../deepLink";

export default defineTool({
  name: "create_persona",
  title: "Criar persona",
  description:
    "Cria uma persona vinculada a uma marca. Todos os campos textuais são obrigatórios porque alimentam o briefing dos entregáveis (caption, imagem, plano). Se algum dado for desconhecido, envie uma descrição curta como `\"a definir\"` em vez de string vazia.",
  inputSchema: {
    brand_id: z.string().uuid(),
    name: z.string().min(1),
    gender: z.string().min(1),
    age: z.string().min(1).describe("Faixa etária, ex: '25-34'."),
    location: z.string().min(1),
    professional_context: z.string().min(1),
    beliefs_and_interests: z.string().min(1),
    content_consumption_routine: z.string().min(1),
    main_goal: z.string().min(1),
    challenges: z.string().min(1),
    preferred_tone_of_voice: z.string().min(1),
    purchase_journey_stage: z.string().min(1),
    interest_triggers: z.string().min(1),
    income_and_purchase_habits: z.string().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    try {
      const userId = ctx.getUserId();
      const { data: profile } = await supabase
        .from("profiles")
        .select("team_id, current_workspace_id")
        .eq("id", userId)
        .maybeSingle();
      const { data, error } = await supabase
        .from("personas")
        .insert({
          ...input,
          user_id: userId,
          team_id: profile?.team_id ?? null,
          workspace_id: profile?.current_workspace_id ?? null,
        })
        .select("id, name, gender, age, location, brand_id, created_at")
        .single();
      if (error) return { content: [{ type: "text", text: error.message }], isError: true };
      const persona = { ...data, deep_link: buildDeepLink("persona", data.id) };
      return {
        content: [{ type: "text", text: JSON.stringify(persona, null, 2) }],
        structuredContent: { persona },
      };
    } catch (e) {
      return { content: [{ type: "text", text: (e as Error).message }], isError: true };
    }
  },
});
