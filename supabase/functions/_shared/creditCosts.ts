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
} as const;

export const FREE_RESOURCE_LIMITS = {
  BRANDS: 3,
  PERSONAS: 3,
  THEMES: 3,
} as const;

export type OpenAIImageQuality = 'low' | 'medium' | 'high' | 'auto';

/**
 * Mapeia a qualidade escolhida no GPT Image 2 ao custo em créditos.
 * 'auto' é tratado como 'medium' para previsibilidade.
 */
export function getOpenAIImageCost(quality: OpenAIImageQuality | undefined): number {
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
}

export function hasEnoughCredits(
  currentCredits: number,
  actionType: keyof typeof CREDIT_COSTS
): boolean {
  return currentCredits >= CREDIT_COSTS[actionType];
}

export function getInsufficientCreditsError(
  currentCredits: number,
  actionType: keyof typeof CREDIT_COSTS
) {
  const required = CREDIT_COSTS[actionType];
  return {
    error: 'Créditos insuficientes',
    required,
    available: currentCredits,
    message: `São necessários ${required} créditos. Você tem ${currentCredits}.`
  };
}
