export interface StrategicTheme {
  id: string;
  brandId: string;
  title: string;
  description: string;
  targetAudience: string;
  tone: string;
  objectives: string[];
  keyMessages: string[];
  createdAt: string;
  updatedAt: string;
  teamId: string;
  userId: string;
}

export interface StrategicThemeSummary {
  id: string;
  brandId: string;
  title: string;
  createdAt: string;
}

export interface Team {
  id: string;
  name: string;
  admin: string;
  plan: string | {
    name: string;
    limits?: {
      themes?: number;
      brands?: number;
      personas?: number;
    };
  };
}