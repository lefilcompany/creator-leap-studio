export interface MoodboardFile {
  name: string;
  type: string;
  content: string;
}

export interface ColorItem {
  id: string;
  name: string;
  hex: string;
  rgb: {
    r: number;
    g: number;
    b: number;
  };
}

export interface Brand {
  id: string;
  name: string;
  responsible: string;
  segment: string;
  values: string;
  keywords: string;
  goals: string;
  inspirations?: string;
  successMetrics: string;
  references: string;
  specialDates?: string;
  promise: string;
  crisisInfo?: string;
  milestones?: string;
  collaborations?: string;
  restrictions: string;
  moodboard: MoodboardFile | null;
  logo: MoodboardFile | null;
  referenceImage?: MoodboardFile | null;
  colorPalette?: ColorItem[] | null;
  createdAt: string;
  updatedAt: string;
  teamId: string;
  userId: string;
}

export interface BrandSummary {
  id: string;
  name: string;
  responsible: string;
  createdAt: string;
  updatedAt: string;
}