import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { errorResult, notAuthenticated, okResult, supabaseForUser } from "../../_shared/supabase";

// Mapeamento 1:1 com o contrato da edge function `generate-image`.
// Obrigatórios no MCP: brand_id, description, reference_image_url.
// A edge function só exige `description`, mas para o fluxo MCP exigimos
// marca (contexto) e uma imagem de referência (fidelidade visual).
export default defineTool({
  name: "create_image_content",
  title: "Criar imagem (pipeline completo)",
  description:
    "Gera uma imagem via pipeline completo do Creator (marca, persona, tema, tom, plataforma, referências visuais). Consome créditos (COMPLETE_IMAGE = 8). Retorna imageUrl, action_id, headline/subtexto sugeridos e créditos consumidos.",
  inputSchema: {
    // ===== Contexto obrigatório =====
    brand_id: z.string().uuid().describe("OBRIGATÓRIO. UUID da marca — puxa identidade, paleta, restrições e feedback aprovado."),
    description: z
      .string()
      .min(1)
      .max(2000)
      .describe("OBRIGATÓRIO. Descrição livre da cena/peça a ser gerada (o 'briefing' bruto)."),
    reference_image_url: z
      .string()
      .url()
      .describe(
        "OBRIGATÓRIO. URL https (ou data URL base64) da imagem de referência principal. Vai como userReferenceImages[0] no pipeline e guia composição/produto/pessoa.",
      ),

    // ===== Contexto opcional =====
    persona_id: z.string().uuid().optional().describe("UUID da persona-alvo."),
    theme_id: z.string().uuid().optional().describe("UUID do tema estratégico/editoria."),
    narrative: z.string().max(2000).optional().describe("Narrativa/história a contar para a persona."),
    campaign_context: z
      .string()
      .max(2000)
      .optional()
      .describe("Bloco de campanha (nome, objetivo, posicionamento) se a peça faz parte de uma campanha."),
    objective: z
      .string()
      .max(500)
      .optional()
      .describe("Objetivo específico da peça. Se omitido, usa `description`."),
    tone: z
      .array(z.string().max(50))
      .max(4)
      .optional()
      .describe("Tons de voz (até 4). Ex.: ['inspirador','profissional']."),

    // ===== Formato / plataforma =====
    platform: z
      .string()
      .optional()
      .describe("Plataforma alvo. Ex.: 'instagram_feed', 'instagram_stories', 'facebook_feed', 'linkedin_feed', 'tiktok'."),
    aspect_ratio: z
      .enum(["1:1", "4:5", "9:16", "16:9", "3:4", "4:3"])
      .optional()
      .describe("Proporção final da imagem. Se omitido, derivado de `platform`. Default: 1:1."),
    width: z.number().int().positive().optional().describe("Largura em px (opcional; sobrepõe aspect_ratio)."),
    height: z.number().int().positive().optional().describe("Altura em px (opcional; sobrepõe aspect_ratio)."),
    content_type: z
      .enum(["organic", "paid"])
      .optional()
      .describe("Tipo de conteúdo: orgânico ou tráfego pago. Default: 'organic'."),

    // ===== Referências visuais adicionais =====
    brand_reference_images: z
      .array(z.string().url())
      .max(3)
      .optional()
      .describe("Até 3 URLs adicionais da marca (moodboard, logo, packaging). Tratadas como 'preservar'."),
    style_reference_images: z
      .array(z.string().url())
      .max(5)
      .optional()
      .describe("Até 5 URLs para inspiração de estilo/paleta (não precisam ser reproduzidas pixel-a-pixel)."),
    preserve_image_indices: z
      .array(z.number().int().min(0))
      .optional()
      .describe(
        "Índices (em style_reference_images) que também devem ser preservados pixel-perfect em vez de servirem só como estilo.",
      ),

    // ===== Texto sobre a imagem =====
    include_text: z
      .boolean()
      .optional()
      .describe("Se deve incluir texto sobre a imagem. Default: true quando `text_content` é fornecido."),
    text_content: z.string().max(200).optional().describe("Texto principal a aparecer na imagem (headline)."),
    text_position: z
      .enum(["top", "center", "bottom", "top_left", "top_right", "bottom_left", "bottom_right"])
      .optional()
      .describe("Posição do texto. Default: 'center'."),
    font_style: z
      .enum(["modern", "classic", "handwritten", "bold", "elegant"])
      .optional()
      .describe("Estilo tipográfico. Default: 'modern'."),
    text_design_style: z
      .enum(["clean", "highlighted", "outlined", "shadow", "badge"])
      .optional()
      .describe("Tratamento visual do texto. Default: 'clean'."),
    font_size: z.number().int().min(12).max(120).optional().describe("Tamanho da fonte em px (12-120)."),
    font_family: z.string().max(80).optional().describe("Nome da família tipográfica (ex.: 'Inter', 'Playfair')."),
    font_weight: z
      .enum(["300", "400", "500", "600", "700", "800", "900"])
      .optional()
      .describe("Peso da fonte."),
    font_italic: z.boolean().optional().describe("Se o texto deve ser itálico."),

    // ===== Extras de anúncio/CTA =====
    cta_text: z.string().max(80).optional().describe("Texto de CTA (ex.: 'Compre agora')."),
    ad_mode: z
      .enum(["regular", "professional"])
      .optional()
      .describe("'professional' ativa regras hierárquicas de anúncio (Headline Hero 30-40%)."),
    price_text: z.string().max(40).optional().describe("Texto de preço a exibir (ex.: 'R$ 199')."),
    include_brand_logo: z.boolean().optional().describe("Se o logo da marca deve ser aplicado na peça."),
    disclaimer_text: z.string().max(300).optional().describe("Disclaimer/legal a incluir na peça."),
    disclaimer_style: z
      .enum(["bottom_horizontal", "bottom_vertical", "top_horizontal", "corner"])
      .optional()
      .describe("Formato do disclaimer. Default: 'bottom_horizontal'."),

    // ===== Direção visual =====
    visual_style: z
      .enum([
        "realistic",
        "cinematic",
        "editorial",
        "minimalist",
        "3d",
        "illustration",
        "flat",
        "vintage",
        "cyberpunk",
      ])
      .optional()
      .describe("Estilo visual base. Default: 'realistic'."),
    color_palette: z
      .string()
      .max(80)
      .optional()
      .describe("Paleta ('auto', 'brand', 'warm', 'cool', 'monochrome', 'pastel', 'vivid'). Default: 'auto'."),
    lighting: z
      .enum(["natural", "studio", "golden_hour", "dramatic", "soft", "neon"])
      .optional()
      .describe("Iluminação. Default: 'natural'."),
    composition: z
      .enum(["auto", "rule_of_thirds", "centered", "symmetrical", "diagonal", "frame_within_frame"])
      .optional()
      .describe("Composição. Default: 'auto'."),
    camera_angle: z
      .enum(["eye_level", "low_angle", "high_angle", "birds_eye", "dutch_angle", "close_up", "wide_shot"])
      .optional()
      .describe("Ângulo de câmera. Default: 'eye_level'."),
    detail_level: z
      .number()
      .int()
      .min(0)
      .max(10)
      .optional()
      .describe("Nível de detalhe/renderização (0-10). Default: 7."),
    mood: z
      .enum(["auto", "energetic", "calm", "playful", "serious", "luxurious", "friendly", "urgent"])
      .optional()
      .describe("Mood. Default: 'auto'."),
    negative_prompt: z
      .string()
      .max(500)
      .optional()
      .describe("Elementos a evitar (ex.: 'texto borrado, mãos deformadas')."),
  },
  annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) return notAuthenticated();
    if (!input.reference_image_url || !input.reference_image_url.trim()) {
      return errorResult("reference_image_url é obrigatório: informe a URL de uma imagem de referência.");
    }
    const supabase = supabaseForUser(ctx);
    const body: Record<string, unknown> = {
      // contexto
      brandId: input.brand_id,
      personaId: input.persona_id,
      themeId: input.theme_id,
      description: input.description,
      objective: input.objective ?? input.description,
      narrative: input.narrative,
      campaignContext: input.campaign_context,
      tone: input.tone ?? [],
      contentType: input.content_type ?? "organic",
      // formato
      platform: input.platform,
      aspectRatio: input.aspect_ratio,
      width: input.width,
      height: input.height,
      // referências
      userReferenceImages: [input.reference_image_url, ...(input.style_reference_images ?? [])],
      brandReferenceImages: input.brand_reference_images ?? [],
      styleReferenceImages: input.style_reference_images ?? [],
      preserveImageIndices: input.preserve_image_indices ?? [],
      // texto
      includeText: input.include_text ?? Boolean(input.text_content),
      textContent: input.text_content,
      textPosition: input.text_position,
      fontStyle: input.font_style,
      textDesignStyle: input.text_design_style,
      fontSize: input.font_size,
      fontFamily: input.font_family,
      fontWeight: input.font_weight,
      fontItalic: input.font_italic,
      // anúncio
      ctaText: input.cta_text,
      adMode: input.ad_mode,
      priceText: input.price_text,
      includeBrandLogo: input.include_brand_logo,
      disclaimerText: input.disclaimer_text,
      disclaimerStyle: input.disclaimer_style,
      // direção visual
      visualStyle: input.visual_style ?? "realistic",
      colorPalette: input.color_palette,
      lighting: input.lighting,
      composition: input.composition,
      cameraAngle: input.camera_angle,
      detailLevel: input.detail_level,
      mood: input.mood,
      negativePrompt: input.negative_prompt,
    };
    const { data, error } = await supabase.functions.invoke("generate-image", { body });
    if (error) return errorResult(error.message);
    return okResult(data, "result");
  },
});
