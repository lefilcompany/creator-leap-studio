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
  | 'credits';

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
}

export interface OnboardingContextType {
  state: OnboardingState;
  isLoading: boolean;
  markTourAsCompleted: (tourType: OnboardingTourType) => Promise<void>;
  resetAllTours: () => Promise<void>;
  isTourCompleted: (tourType: OnboardingTourType) => boolean;
  shouldShowTour: (tourType: OnboardingTourType) => boolean;
}
