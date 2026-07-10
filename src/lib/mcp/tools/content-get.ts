import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fail, ok, requireAuth, supabaseForUser } from "../_shared";

export default defineTool({
  name: "content_get",
  title: "Obter conteúdo",
  description: "Retorna detalhes completos de um conteúdo (action) por ID, incluindo details e result.",
  inputSchema: { id: z.string().uuid() },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    const uid = requireAuth(ctx);
    if (typeof uid !== "string") return uid;
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("actions")
      .select("id, type, status, approved, brand_id, parent_action_id, details, result, thumb_path, asset_path, created_at, updated_at, deleted_at")
      .eq("id", id)
      .maybeSingle();
    if (error) return fail("db_error", error.message);
    if (!data) return fail("not_found", "Conteúdo não encontrado ou sem acesso.");
    return ok(data, `Conteúdo ${data.type}`);
  },
});
