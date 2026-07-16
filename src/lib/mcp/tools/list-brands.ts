import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabaseClient";

export default defineTool({
  name: "list_brands",
  title: "Listar marcas",
  description:
    "Lista as marcas que o usuário autenticado tem acesso (respeita RLS e equipe).",
  inputSchema: {
    limit: z
      .number()
      .int()
      .min(1)
      .max(100)
      .optional()
      .describe("Máximo de marcas a retornar. Padrão 50."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data, error } = await supabase
      .from("brands")
      .select("id, name, segment, brand_color, created_at")
      .order("name")
      .limit(limit ?? 50);
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { brands: data ?? [] },
    };
  },
});
