import { useState, useEffect } from 'react';

interface User {
  id: string;
  email: string;
  name: string;
  teamId?: string;
}

interface Team {
  id: string;
  name: string;
  admin: string;
  plan: string | { name: string };
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
    admin: 'copy@lefil.com.br',
    plan: 'PREMIUM'
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