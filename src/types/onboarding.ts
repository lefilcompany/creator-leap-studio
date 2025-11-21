export type OnboardingTourType = 
  | 'navbar'
  | 'dashboard'
  | 'brands'
  | 'themes'
  | 'personas'
  | 'create_content'
  | 'quick_content'
  | 'plan_content'
  | 'history'
  | 'credits'
  | 'review_content'
  | 'review_content_image'
  | 'review_content_caption'
  | 'review_content_text';

export interface OnboardingState {
  onboarding_navbar_completed: boolean;
  onboarding_dashboard_completed: boolean;
  onboarding_brands_completed: boolean;
  onboarding_themes_completed: boolean;
  onboarding_personas_completed: boolean;
  onboarding_create_content_completed: boolean;
  onboarding_quick_content_completed: boolean;
  onboarding_plan_content_completed: boolean;
  onboarding_history_completed: boolean;
  onboarding_credits_completed: boolean;
  onboarding_review_content_completed: boolean;
  onboarding_review_content_image_completed: boolean;
  onboarding_review_content_caption_completed: boolean;
  onboarding_review_content_text_completed: boolean;
}

export interface OnboardingContextType {
  state: OnboardingState;
  isLoading: boolean;
  markTourAsCompleted: (tourType: OnboardingTourType) => Promise<void>;
  resetAllTours: () => Promise<void>;
  isTourCompleted: (tourType: OnboardingTourType) => boolean;
  shouldShowTour: (tourType: OnboardingTourType) => boolean;
}
