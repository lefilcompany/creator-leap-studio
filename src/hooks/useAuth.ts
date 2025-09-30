import { useState, useEffect } from 'react';
import type { Plan } from '@/types/plan';

interface User {
  id: string;
  email: string;
  name: string;
  teamId?: string;
}

interface Team {
  id: string;
  name: string;
  code?: string;
  admin: string;
  plan: Plan;
  credits?: {
    quickContentCreations: number;
    contentSuggestions: number;
    contentReviews: number;
    contentPlans: number;
  };
}

// Mock hook for authentication - replace with your actual auth implementation
export function useAuth() {
  const [user, setUser] = useState<User | null>({
    id: '1',
    email: 'copy@lefil.com.br',
    name: 'Usuário Creator',
    teamId: 'team-1'
  });
  
  const [team, setTeam] = useState<Team | null>({
    id: 'team-1',
    name: 'LeFil',
    code: 'TIMELEFIL',
    admin: 'copy@lefil.com.br',
    plan: {
      id: '3',
      name: 'PRO',
      displayName: 'Premium',
      price: 99.90,
      trialDays: 14,
      maxMembers: 10,
      maxBrands: 20,
      maxStrategicThemes: 50,
      maxPersonas: 30,
      quickContentCreations: 1000,
      customContentSuggestions: 500,
      contentPlans: 100,
      contentReviews: 200,
      isActive: true,
    },
    credits: {
      quickContentCreations: 736,
      contentSuggestions: 350,
      contentReviews: 145,
      contentPlans: 67,
    }
  });
  
  const [isLoading, setIsLoading] = useState(false);

  return {
    user,
    team,
    isAuthenticated: !!user,
    isLoading,
    logout: () => setUser(null)
  };
}
