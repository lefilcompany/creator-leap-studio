export const CREDIT_COSTS = {
  QUICK_IMAGE: 5,           // Imagem rápida (QuickContent)
  COMPLETE_IMAGE: 6,        // Imagem completa (CreateContent)
  IMAGE_GENERATION: 5,      // Geração de imagem standalone
  IMAGE_REVIEW: 2,          // Revisão de imagem
  CAPTION_REVIEW: 2,        // Revisão de legenda
  TEXT_REVIEW: 2,           // Revisão de copy/texto
  CONTENT_PLAN: 3,          // Planejamento de conteúdo
  VIDEO_GENERATION: 20,     // Geração de vídeo
  CREATE_BRAND: 1,          // Criar marca (após 3 gratuitas)
  CREATE_PERSONA: 1,        // Criar persona (após 3 gratuitas)
  CREATE_THEME: 1,          // Criar tema (após 3 gratuitos)
} as const;

export const FREE_RESOURCE_LIMITS = {
  BRANDS: 3,
  PERSONAS: 3,
  THEMES: 3,
} as const;
