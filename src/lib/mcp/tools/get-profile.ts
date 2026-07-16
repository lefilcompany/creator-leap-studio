import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabaseClient";

export default defineTool({
  name: "get_profile",
  title: "Obter perfil",
  description: "Retorna dados do perfil do usuário autenticado.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, email, phone, city, state, team_id, current_workspace_id, avatar_url")
      .eq("id", ctx.getUserId())
      .maybeSingle();
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? {}, null, 2) }],
      structuredContent: { profile: data ?? null },
    };
  },
});
