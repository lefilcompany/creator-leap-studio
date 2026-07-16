import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, notAuthenticated, okResult, supabaseForUser } from "../../_shared/supabase";

export default defineTool({
  name: "review_image",
  title: "Revisar/ajustar imagem",
  description: "Aplica ajustes descritos em linguagem natural a uma imagem existente.",
  inputSchema: {
    image_url: z.string().url().describe("URL da imagem base a ser ajustada."),
    prompt: z.string().min(1).describe("Instruções de ajuste."),
    brand_id: z.string().uuid().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  handler: async ({ image_url, prompt, brand_id }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    let brandName: string | undefined;
    if (brand_id) {
      const { data: b } = await supabase.from("brands").select("name").eq("id", brand_id).maybeSingle();
      brandName = b?.name;
    }
    const { data, error } = await supabase.functions.invoke("review-image", {
      body: { image: image_url, prompt, brandId: brand_id, brandName, source: "mcp" },
    });
    if (error) return errorResult(error.message);
    return okResult(data, "result");
  },
});
