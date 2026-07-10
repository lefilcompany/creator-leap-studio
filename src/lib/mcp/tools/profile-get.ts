import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fail, ok, requireAuth, stripSensitive, supabaseForUser } from "../_shared";

export default defineTool({
  name: "profile_get",
  title: "Consultar perfil",
  description:
    "Retorna o perfil do usuário autenticado (nome, email, telefone, cidade, estado, plano).",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    const uid = requireAuth(ctx);
    if (typeof uid !== "string") return uid;
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, name, email, phone, state, city, avatar_url, credits, max_credits, credits_expire_at, plan_id, subscription_status, team_id, tutorial_completed, created_at",
      )
      .eq("id", uid)
      .maybeSingle();
    if (error) return fail("db_error", error.message);
    if (!data) return fail("not_found", "Perfil não encontrado.");
    return ok(stripSensitive(data), `Perfil de ${data.name ?? data.email}`);
  },
});
