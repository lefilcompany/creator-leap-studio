import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fail, ok, requireAuth, supabaseForUser, withAudit } from "../_shared";

const brandFields = {
  name: z.string().trim().min(1).max(100),
  responsible: z.string().trim().min(1).max(100),
  segment: z.string().trim().min(1).max(100),
  values: z.string().trim().max(2000).optional(),
  keywords: z.string().trim().max(500).optional(),
  goals: z.string().trim().max(2000).optional(),
  promise: z.string().trim().max(1000).optional(),
  brand_color: z.string().trim().max(20).optional(),
  avatar_url: z.string().url().max(500).optional(),
};

export default defineTool({
  name: "brands_create",
  title: "Criar marca",
  description: "Cria uma nova marca vinculada ao usuário autenticado.",
  inputSchema: brandFields,
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
    const { data, error } = await supabase
      .from("brands")
      .insert(payload)
      .select("id, name, segment, created_at")
      .maybeSingle();
    const result = error
      ? fail("db_error", error.message)
      : ok(data, `Marca criada: ${data?.name}`);
    return withAudit(
      ctx,
      { toolName: "brands_create", action: "create", resourceType: "brand", resourceId: data?.id ?? null },
      result,
    );
  },
});
