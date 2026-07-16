import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, notAuthenticated, okResult, supabaseForUser } from "../../_shared/supabase";

export default defineTool({
  name: "create_image_content",
  title: "Criar imagem (pipeline completo)",
  description:
    "Gera uma imagem usando o pipeline completo do Creator (marca, persona, tema, tom de voz, plataforma). Retorna a URL da imagem e o id da action.",
  inputSchema: {
    brand_id: z.string().uuid().describe("ID da marca (obrigatório para contexto)."),
    description: z.string().min(1).describe("Descrição da cena a ser gerada."),
    persona_id: z.string().uuid().optional(),
    theme_id: z.string().uuid().optional(),
    narrative: z.string().optional().describe("Narrativa a contar para a persona."),
    tone: z
      .array(z.string())
      .max(4)
      .optional()
      .describe("Tons de voz (até 4). Ex.: ['inspirador','profissional']."),
    platform: z.string().optional().describe("Plataforma alvo (ex.: 'instagram_feed')."),
    aspect_ratio: z.string().optional().describe("Ex.: '1:1', '4:5', '9:16'."),
    include_text: z.boolean().optional().describe("Se deve incluir texto sobre a imagem."),
    text_content: z.string().optional().describe("Texto a aparecer na imagem."),
    content_type: z.enum(["organic", "paid"]).optional(),
    campaign_context: z.string().optional().describe("Bloco de campanha (nome, objetivo, posicionamento)."),
    visual_style: z.string().optional(),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    const supabase = supabaseForUser(ctx);
    const body: Record<string, unknown> = {
      brandId: input.brand_id,
      description: input.description,
      personaId: input.persona_id,
      themeId: input.theme_id,
      narrative: input.narrative,
      tone: input.tone ?? [],
      platform: input.platform,
      aspectRatio: input.aspect_ratio,
      includeText: input.include_text ?? Boolean(input.text_content),
      textContent: input.text_content,
      contentType: input.content_type ?? "organic",
      campaignContext: input.campaign_context,
      visualStyle: input.visual_style ?? "realistic",
      objective: input.description,
    };
    const { data, error } = await supabase.functions.invoke("generate-image", { body });
    if (error) return errorResult(error.message);
    return okResult(data, "result");
  },
});
