export const CREDIT_COSTS = {
  QUICK_IMAGE: 3,
  COMPLETE_IMAGE: 8,
  IMAGE_GENERATION: 5,
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
} as const;

export const getCreditCostLabel = (action: keyof typeof CREDIT_COSTS): string => {
  const labels: Record<keyof typeof CREDIT_COSTS, string> = {
    QUICK_IMAGE: "Imagem rápida",
    COMPLETE_IMAGE: "Imagem completa",
    IMAGE_GENERATION: "Geração de imagem",
    IMAGE_EDIT: "Correção de imagem",
    IMAGE_REVIEW: "Revisão de imagem",
    CAPTION_REVIEW: "Revisão de legenda",
    TEXT_REVIEW: "Revisão de texto",
    CONTENT_PLAN: "Calendário de conteúdo",
    VIDEO_GENERATION: "Geração de vídeo",
    IMAGE_ANIMATION: "Animação de imagem",
    CREATE_BRAND: "Criar marca",
    CREATE_PERSONA: "Criar persona",
    CREATE_THEME: "Criar tema",
    MARKETPLACE_IMAGE: "Imagem para marketplace",
  };
  return labels[action];
};

export const formatCredits = (credits: number): string => {
  return `${credits} ${credits === 1 ? 'crédito' : 'créditos'}`;
};
