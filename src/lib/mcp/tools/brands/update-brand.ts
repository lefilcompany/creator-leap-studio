import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, notAuthenticated, okResult, supabaseForUser } from "../../_shared/supabase";

export default defineTool({
  name: "update_brand",
  title: "Atualizar marca",
  description: "Atualiza campos parciais de uma marca existente.",
  inputSchema: {
    id: z.string().uuid().describe("ID da marca."),
    name: z.string().optional(),
    segment: z.string().optional(),
    values: z.string().optional(),
    keywords: z.string().optional(),
    goals: z.string().optional(),
    inspirations: z.string().optional(),
    success_metrics: z.string().optional(),
    brand_references: z.string().optional(),
    special_dates: z.string().optional(),
    promise: z.string().optional(),
    restrictions: z.string().optional(),
    brand_color: z.string().optional(),
    logo_url: z.string().url().optional().describe("Se informado, substitui o logo."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  handler: async ({ id, logo_url, ...rest }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const patch: Record<string, unknown> = { ...rest };
    if (logo_url) patch.logo = { url: logo_url };
    if (Object.keys(patch).length === 0) return errorResult("Nada para atualizar.");
    const { data, error } = await supabaseForUser(ctx)
      .from("brands")
      .update(patch)
      .eq("id", id)
      .select()
      .single();
    if (error) return errorResult(error.message);
    return okResult(data, "brand");
  },
});
