import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, notAuthenticated, okResult, supabaseForUser } from "../../_shared/supabase";

export default defineTool({
  name: "review_text_for_image",
  title: "Revisar texto sobre imagem",
  description: "Aplica ajustes ao texto que aparece sobre uma imagem (headline, CTA, disclaimer).",
  inputSchema: {
    text: z.string().min(1).describe("Texto atual sobre a imagem."),
    prompt: z.string().min(1).describe("Instruções de ajuste."),
    brand_id: z.string().uuid().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  handler: async ({ text, prompt, brand_id }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    let brandName: string | undefined;
    if (brand_id) {
      const { data: b } = await supabase.from("brands").select("name").eq("id", brand_id).maybeSingle();
      brandName = b?.name;
    }
    const { data, error } = await supabase.functions.invoke("review-text-for-image", {
      body: { text, prompt, brandId: brand_id, brandName },
    });
    if (error) return errorResult(error.message);
    return okResult(data, "result");
  },
});
