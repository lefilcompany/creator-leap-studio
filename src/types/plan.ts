export interface Plan {
  id: string;
  name: string;
  displayName: string;
  price: number;
  trialDays: number;
  maxMembers: number;
  maxBrands: number;
  maxStrategicThemes: number;
  maxPersonas: number;
  quickContentCreations: number;
  customContentSuggestions: number;
  contentPlans: number;
  contentReviews: number;
  isActive: boolean;
  stripePriceId?: string | null;
}

export interface TeamCredits {
  quickContentCreations: number;
  contentSuggestions: number;
  contentReviews: number;
  contentPlans: number;
}
