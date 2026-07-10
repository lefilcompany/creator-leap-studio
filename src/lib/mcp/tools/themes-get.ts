import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fail, ok, requireAuth, supabaseForUser } from "../_shared";

export default defineTool({
  name: "themes_get",
  title: "Obter tema estratégico",
  description: "Retorna detalhes completos de um tema estratégico por ID.",
  inputSchema: { id: z.string().uuid() },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    const uid = requireAuth(ctx);
    if (typeof uid !== "string") return uid;
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase.from("strategic_themes").select("*").eq("id", id).maybeSingle();
    if (error) return fail("db_error", error.message);
    if (!data) return fail("not_found", "Tema não encontrado ou sem acesso.");
    return ok(data, `Tema: ${data.title}`);
  },
});
