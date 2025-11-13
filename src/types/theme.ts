import type { Plan } from "./plan";

export type StrategicTheme = {
  id: string;
  teamId: string;
  userId: string;
  brandId: string;
  title: string;
  description: string;
  colorPalette: string;
  toneOfVoice: string;
  targetAudience: string;
  hashtags: string;
  objectives: string;
  contentFormat: string;
  macroThemes: string;
  bestFormats: string;
  platforms: string;
  expectedAction: string;
  additionalInfo: string;
  createdAt: string;
  updatedAt: string;
};

// Dados mínimos utilizados nas listagens de temas
export type StrategicThemeSummary = Pick<StrategicTheme, 'id' | 'brandId' | 'title' | 'createdAt'>;

export interface Team {
  id: string;
  name: string;
  code?: string;
  displayCode?: string;
  admin: string; // admin email
  admin_id?: string; // admin user id
  members: string[];
  pending: string[];
  plan: Plan | null;
  credits: number; // Créditos unificados
}


export interface TeamSummary {
  id: string;
  name: string;
  code: string;
  plan: Team['plan'];
  credits?: Team['credits'];
  totalBrands: number;
  totalContents: number;
}