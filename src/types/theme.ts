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
  code: string;
  displayCode?: string;
  admin: string; // admin email
  members: string[];
  pending: string[];
  plan: string | {
    name: string;
    limits: {
      members: number;
      brands: number;
      themes: number;
      personas: number;
      calendars: number;
      contentSuggestions: number;
      contentReviews: number;
    };
  };
  credits?: {
    contentSuggestions: number;
    contentReviews: number;
    contentPlans: number;
  };
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