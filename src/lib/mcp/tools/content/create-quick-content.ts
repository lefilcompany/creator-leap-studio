import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, notAuthenticated, okResult, supabaseForUser } from "../../_shared/supabase";

export default defineTool({
  name: "create_quick_content",
  title: "Criar conteúdo rápido",
  description: "Fluxo rápido de geração de imagem a partir de um prompt livre (sem contexto de marca obrigatório).",
  inputSchema: {
    prompt: z.string().min(1).max(5000).describe("Prompt livre descrevendo a imagem desejada."),
    aspect_ratio: z.string().optional().describe("Ex.: '1:1', '4:5', '9:16'."),
    platform: z.string().optional(),
    brand_id: z.string().uuid().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  handler: async ({ prompt, aspect_ratio, platform, brand_id }, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const { data, error } = await supabaseForUser(ctx).functions.invoke("generate-quick-content", {
      body: { prompt, aspectRatio: aspect_ratio, platform, brandId: brand_id },
    });
    if (error) return errorResult(error.message);
    return okResult(data, "result");
  },
});
