import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fail, ok, requireAuth, supabaseForUser, withAudit } from "../_shared";

export default defineTool({
  name: "themes_create",
  title: "Criar tema estratégico",
  description: "Cria um novo tema estratégico vinculado a uma marca.",
  inputSchema: {
    brand_id: z.string().uuid(),
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(2000).optional(),
    tone_of_voice: z.string().trim().max(500).optional(),
    target_audience: z.string().trim().max(1000).optional(),
    hashtags: z.string().trim().max(1000).optional(),
    objectives: z.string().trim().max(2000).optional(),
    content_format: z.string().trim().max(500).optional(),
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
    const { data, error } = await supabase.from("strategic_themes").insert(payload).select("id, title").maybeSingle();
    const result = error ? fail("db_error", error.message) : ok(data, `Tema criado: ${data?.title}`);
    return withAudit(ctx, { toolName: "themes_create", action: "create", resourceType: "theme", resourceId: data?.id ?? null }, result);
  },
});
