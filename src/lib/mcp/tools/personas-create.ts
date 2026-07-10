import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fail, ok, requireAuth, supabaseForUser, withAudit } from "../_shared";

export default defineTool({
  name: "personas_create",
  title: "Criar persona",
  description: "Cria uma nova persona vinculada a uma marca do usuário.",
  inputSchema: {
    brand_id: z.string().uuid(),
    name: z.string().trim().min(1).max(100),
    gender: z.string().trim().max(50).optional(),
    age: z.string().trim().max(50).optional(),
    location: z.string().trim().max(200).optional(),
    professional_context: z.string().trim().max(2000).optional(),
    beliefs_and_interests: z.string().trim().max(2000).optional(),
    main_goal: z.string().trim().max(2000).optional(),
    challenges: z.string().trim().max(2000).optional(),
    preferred_tone_of_voice: z.string().trim().max(500).optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    const uid = requireAuth(ctx);
    if (typeof uid !== "string") return uid;
    const supabase = supabaseForUser(ctx);
    const { data: profile } = await supabase
      .from("profiles")
      .select("team_id, current_workspace_id")
      .eq("id", uid)
      .maybeSingle();
    const payload = {
      ...Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined)),
      user_id: uid,
      team_id: profile?.team_id ?? null,
      workspace_id: profile?.current_workspace_id ?? null,
    };
    const { data, error } = await supabase.from("personas").insert(payload).select("id, name, brand_id").maybeSingle();
    const result = error ? fail("db_error", error.message) : ok(data, `Persona criada: ${data?.name}`);
    return withAudit(ctx, { toolName: "personas_create", action: "create", resourceType: "persona", resourceId: data?.id ?? null }, result);
  },
});
