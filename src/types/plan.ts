export interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  credits: number; // Créditos unificados
  maxMembers: number;
  maxBrands: number;
  maxStrategicThemes: number;
  maxPersonas: number;
  trialDays: number;
  isActive: boolean;
  stripePriceId?: string | null;
  stripeProductId?: string | null;
}

export interface TeamCredits {
  credits: number; // Créditos unificados
}
