import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fail, ok, requireAuth, supabaseForUser, withAudit } from "../_shared";

export default defineTool({
  name: "content_favorite",
  title: "Favoritar conteúdo",
  description: "Adiciona um conteúdo aos favoritos com escopo 'me' (pessoal) ou 'team' (compartilhado com a equipe).",
  inputSchema: {
    action_id: z.string().uuid(),
    scope: z.enum(["me", "team"]).default("me"),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  handler: async ({ action_id, scope }, ctx) => {
    const uid = requireAuth(ctx);
    if (typeof uid !== "string") return uid;
    const supabase = supabaseForUser(ctx);
    const { data: profile } = await supabase.from("profiles").select("team_id, current_workspace_id").eq("id", uid).maybeSingle();
    const payload = {
      user_id: uid,
      action_id,
      scope,
      team_id: scope === "team" ? profile?.team_id ?? null : null,
      workspace_id: profile?.current_workspace_id ?? null,
    };
    const { data, error } = await supabase.from("action_favorites").insert(payload).select("id, scope").maybeSingle();
    const result = error
      ? error.code === "23505"
        ? ok({ already: true }, "Já estava favoritado.")
        : fail("db_error", error.message)
      : ok(data, "Favoritado.");
    return withAudit(ctx, { toolName: "content_favorite", action: "favorite", resourceType: "action", resourceId: action_id, metadata: { scope } }, result);
  },
});
