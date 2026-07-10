import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fail, ok, requireAuth, supabaseForUser, withAudit } from "../_shared";

export default defineTool({
  name: "categories_create",
  title: "Criar categoria",
  description: "Cria uma nova categoria de conteúdo. Visibilidade: 'personal' (só o dono) ou 'team' (equipe do usuário).",
  inputSchema: {
    name: z.string().trim().min(1).max(100),
    description: z.string().trim().max(500).optional(),
    color: z.string().trim().max(20).optional(),
    visibility: z.enum(["personal", "team"]).default("personal"),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async (input, ctx) => {
    const uid = requireAuth(ctx);
    if (typeof uid !== "string") return uid;
    const supabase = supabaseForUser(ctx);
    const { data: profile } = await supabase.from("profiles").select("team_id, current_workspace_id").eq("id", uid).maybeSingle();
    if (input.visibility === "team" && !profile?.team_id)
      return fail("invalid_input", "Você precisa pertencer a uma equipe para criar categorias com visibilidade 'team'.");
    const payload = {
      name: input.name,
      description: input.description ?? null,
      color: input.color ?? null,
      visibility: input.visibility,
      user_id: uid,
      team_id: input.visibility === "team" ? profile?.team_id : null,
      workspace_id: profile?.current_workspace_id ?? null,
    };
    const { data, error } = await supabase.from("action_categories").insert(payload).select("id, name, visibility").maybeSingle();
    const result = error ? fail("db_error", error.message) : ok(data, `Categoria criada: ${data?.name}`);
    return withAudit(ctx, { toolName: "categories_create", action: "create", resourceType: "category", resourceId: data?.id ?? null }, result);
  },
});
