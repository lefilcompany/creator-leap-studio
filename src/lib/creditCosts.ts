export const CREDIT_COSTS = {
  QUICK_IMAGE: 3,
  COMPLETE_IMAGE: 8,                // legado / fallback
  COMPLETE_IMAGE_LOW: 4,            // OpenAI GPT Image 2 — quality: low
  COMPLETE_IMAGE_MEDIUM: 8,         // OpenAI GPT Image 2 — quality: medium
  COMPLETE_IMAGE_HIGH: 15,          // OpenAI GPT Image 2 — quality: high
  IMAGE_EDIT: 1,
  IMAGE_REVIEW: 4,
  CAPTION_REVIEW: 2,
  TEXT_REVIEW: 2,
  CONTENT_PLAN: 8,
  VIDEO_GENERATION: 25,
  IMAGE_ANIMATION: 15,
  CREATE_BRAND: 1,
  CREATE_PERSONA: 1,
  CREATE_THEME: 1,
  MARKETPLACE_IMAGE: 5,
  PPTX_EXPORT_NO_WATERMARK: 2,
} as const;

export type OpenAIImageQuality = 'low' | 'medium' | 'high' | 'auto';

/**
 * Mapeia a qualidade escolhida do GPT Image 2 ao custo em créditos.
 * 'auto' é tratado como 'medium' para previsibilidade.
 */
export const getOpenAIImageCost = (quality: OpenAIImageQuality | undefined): number => {
  switch (quality) {
    case 'low':
      return CREDIT_COSTS.COMPLETE_IMAGE_LOW;
    case 'high':
      return CREDIT_COSTS.COMPLETE_IMAGE_HIGH;
    case 'medium':
    case 'auto':
    default:
      return CREDIT_COSTS.COMPLETE_IMAGE_MEDIUM;
  }
};

export const getCreditCostLabel = (action: keyof typeof CREDIT_COSTS): string => {
  const labels: Record<keyof typeof CREDIT_COSTS, string> = {
    QUICK_IMAGE: "Imagem rápida",
    COMPLETE_IMAGE: "Imagem completa",
    COMPLETE_IMAGE_LOW: "Imagem completa (qualidade baixa)",
    COMPLETE_IMAGE_MEDIUM: "Imagem completa (qualidade média)",
    COMPLETE_IMAGE_HIGH: "Imagem completa (qualidade alta)",
    IMAGE_EDIT: "Correção de imagem",
    IMAGE_REVIEW: "Revisão de imagem",
    CAPTION_REVIEW: "Revisão de legenda",
    TEXT_REVIEW: "Revisão de texto",
    CONTENT_PLAN: "Calendário de conteúdo",
    VIDEO_GENERATION: "Geração de vídeo",
    IMAGE_ANIMATION: "Animação de imagem",
    CREATE_BRAND: "Criar marca",
    CREATE_PERSONA: "Criar persona",
    CREATE_THEME: "Criar editoria",
    MARKETPLACE_IMAGE: "Imagem para marketplace",
    PPTX_EXPORT_NO_WATERMARK: "Exportação PPT sem marca d'água",
  };
  return labels[action];
};

export const formatCredits = (credits: number): string => {
  return `${credits} ${credits === 1 ? 'crédito' : 'créditos'}`;
};
