import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { fail, ok, requireAuth, supabaseForUser } from "../_shared";

export default defineTool({
  name: "personas_get",
  title: "Obter persona",
  description: "Retorna os detalhes completos de uma persona por ID.",
  inputSchema: { id: z.string().uuid() },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ id }, ctx) => {
    const uid = requireAuth(ctx);
    if (typeof uid !== "string") return uid;
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase.from("personas").select("*").eq("id", id).maybeSingle();
    if (error) return fail("db_error", error.message);
    if (!data) return fail("not_found", "Persona não encontrada ou sem acesso.");
    return ok(data, `Persona: ${data.name}`);
  },
});
