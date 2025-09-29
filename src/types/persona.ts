export interface Persona {
  id: string;
  brandId: string;
  name: string;
  age: number;
  occupation: string;
  location: string;
  description: string;
  goals: string;
  frustrations: string;
  behaviors: string;
  channels: string[];
  personalityTraits: string;
  demographics: {
    gender: string;
    income: string;
    education: string;
    familyStatus: string;
  };
  psychographics: {
    values: string;
    interests: string;
    lifestyle: string;
  };
  createdAt: string;
  updatedAt: string;
  teamId: string;
  userId: string;
}

export interface PersonaSummary {
  id: string;
  brandId: string;
  name: string;
  createdAt: string;
}