import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Plan } from '@/types/plan';
import type { User as SupabaseUser, Session } from '@supabase/supabase-js';

interface User {
  id: string;
  email: string;
  name: string;
  teamId?: string;
  isAdmin?: boolean;
}

interface Team {
  id: string;
  name: string;
  code?: string;
  admin: string;
  admin_id?: string;
  plan: Plan;
  credits?: {
    quickContentCreations: number;
    contentSuggestions: number;
    contentReviews: number;
    contentPlans: number;
  };
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Função para verificar se a sessão customizada expirou
    const checkSessionExpiration = () => {
      const sessionInfo = localStorage.getItem('creator_session_info');
      if (sessionInfo) {
        try {
          const { loginTime, expiresIn } = JSON.parse(sessionInfo);
          const currentTime = Date.now();
          const elapsed = currentTime - loginTime;
          
          // Se passou do tempo limite, faz logout
          if (elapsed >= expiresIn) {
            console.log('Sessão expirada, fazendo logout...');
            localStorage.removeItem('creator_session_info');
            supabase.auth.signOut();
            return false;
          }
          return true;
        } catch (error) {
          console.error('Erro ao verificar expiração da sessão:', error);
          return true;
        }
      }
      return true;
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        
        // Defer Supabase calls with setTimeout to prevent deadlock
        if (session?.user) {
          // Verifica se a sessão customizada ainda é válida
          const isValid = checkSessionExpiration();
          
          if (isValid) {
            setTimeout(() => {
              loadUserData(session.user);
            }, 0);
          } else {
            setUser(null);
            setTeam(null);
            setIsLoading(false);
          }
        } else {
          setUser(null);
          setTeam(null);
          setIsLoading(false);
          // Limpa info de sessão customizada ao deslogar
          localStorage.removeItem('creator_session_info');
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        // Verifica se a sessão customizada ainda é válida
        const isValid = checkSessionExpiration();
        
        if (isValid) {
          setTimeout(() => {
            loadUserData(session.user);
          }, 0);
        } else {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    });

    // Configura verificação periódica da expiração (a cada 1 minuto)
    const intervalId = setInterval(() => {
      checkSessionExpiration();
    }, 60000); // 60 segundos

    return () => {
      subscription.unsubscribe();
      clearInterval(intervalId);
    };
  }, []);

  const checkIfAdmin = async (userId: string, teamId: string) => {
    const { data: teamData } = await supabase
      .from('teams')
      .select('admin_id')
      .eq('id', teamId)
      .single();
    
    return teamData?.admin_id === userId;
  };

  const loadUserData = async (supabaseUser: SupabaseUser) => {
    try {
      // Load profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (profile) {
        const isTeamAdmin = profile.team_id ? await checkIfAdmin(supabaseUser.id, profile.team_id) : false;
        
        setUser({
          id: profile.id,
          email: profile.email,
          name: profile.name,
          teamId: profile.team_id,
          isAdmin: isTeamAdmin
        });

        // Load team if user has one
        if (profile.team_id) {
          const { data: teamData } = await supabase
            .from('teams')
            .select(`
              *,
              plans (*)
            `)
            .eq('id', profile.team_id)
            .single();

          if (teamData && teamData.plans) {
            const planData = teamData.plans as any;
            
            setTeam({
              id: teamData.id,
              name: teamData.name,
              code: teamData.code,
              admin: teamData.admin_id,
              admin_id: teamData.admin_id,
              plan: {
                id: planData.id,
                name: planData.name,
                displayName: planData.name,
                price: planData.price_monthly || 0,
                trialDays: planData.trial_days,
                maxMembers: planData.max_members,
                maxBrands: planData.max_brands,
                maxStrategicThemes: planData.max_strategic_themes,
                maxPersonas: planData.max_personas,
                quickContentCreations: planData.credits_quick_content,
                customContentSuggestions: planData.credits_suggestions,
                contentPlans: planData.credits_plans,
                contentReviews: planData.credits_reviews,
                isActive: planData.is_active,
              },
              credits: {
                quickContentCreations: teamData.credits_quick_content,
                contentSuggestions: teamData.credits_suggestions,
                contentReviews: teamData.credits_reviews,
                contentPlans: teamData.credits_plans,
              }
            });
          }
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    // Limpa info de sessão customizada
    localStorage.removeItem('creator_session_info');
    await supabase.auth.signOut();
    setUser(null);
    setTeam(null);
  };

  return {
    user,
    session,
    team,
    isAuthenticated: !!user,
    isLoading,
    logout
  };
}
