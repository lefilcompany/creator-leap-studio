import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabaseClient";

export default defineTool({
  name: "list_personas",
  title: "Listar personas",
  description:
    "Lista as personas do usuário autenticado. Filtra opcionalmente por marca.",
  inputSchema: {
    brand_id: z
      .string()
      .uuid()
      .optional()
      .describe("Se informado, retorna somente personas dessa marca."),
    limit: z.number().int().min(1).max(100).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ brand_id, limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    let q = supabase
      .from("personas")
      .select("id, name, gender, age, location, brand_id, created_at")
      .order("name")
      .limit(limit ?? 50);
    if (brand_id) q = q.eq("brand_id", brand_id);
    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { personas: data ?? [] },
    };
  },
});
