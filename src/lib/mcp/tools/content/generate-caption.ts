import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, notAuthenticated, okResult, supabaseForUser } from "../../_shared/supabase";

export default defineTool({
  name: "generate_caption",
  title: "Gerar legenda",
  description: "Gera legenda para uma imagem/conteúdo, usando contexto de marca e persona se fornecido.",
  inputSchema: {
    prompt: z.string().min(1).describe("Instrução ou contexto para a legenda."),
    image_url: z.string().url().optional().describe("URL da imagem base."),
    brand_id: z.string().uuid().optional(),
    persona_id: z.string().uuid().optional(),
    theme_id: z.string().uuid().optional(),
    platform: z.string().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const { data, error } = await supabaseForUser(ctx).functions.invoke("generate-caption", {
      body: {
        prompt: input.prompt,
        imageUrl: input.image_url,
        brandId: input.brand_id,
        personaId: input.persona_id,
        themeId: input.theme_id,
        platform: input.platform,
      },
    });
    if (error) return errorResult(error.message);
    return okResult(data, "caption");
  },
});
