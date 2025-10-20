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
  subscription_period_end?: string;
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
  const [isTrialExpired, setIsTrialExpired] = useState(false);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState<number | null>(null);
  const [lastReloadTime, setLastReloadTime] = useState<number>(0);
  const [dataCache, setDataCache] = useState<{
    timestamp: number;
    user: User | null;
    team: Team | null;
  } | null>(null);

  const RELOAD_DEBOUNCE_MS = 5000; // 5 segundos entre reloads
  const CACHE_VALIDITY_MS = 60000; // 1 minuto de validade do cache

  const reloadUserData = async () => {
    if (session?.user) {
      await loadUserData(session.user);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event);
        
        // Eventos que NÃO requerem reload de dados
        if (event === 'TOKEN_REFRESHED') {
          console.log('Token refreshed successfully - updating session only');
          setSession(session);
          return; // ✅ Apenas atualiza sessão, não recarrega dados
        }
        
        // Evento de sign out
        if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setTeam(null);
          setDataCache(null); // Limpar cache
          setIsLoading(false);
          return;
        }
        
        // Apenas para SIGNED_IN e INITIAL_SESSION, recarregar dados
        if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
          setSession(session);
          
          if (session?.user) {
            setTimeout(() => {
              loadUserData(session.user);
            }, 0);
          } else {
            setUser(null);
            setTeam(null);
            setIsLoading(false);
          }
        } else {
          // Para outros eventos, apenas atualizar sessão
          setSession(session);
        }
      }
    );

    // Check for existing session and validate token
    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          // Clear corrupted session
          await supabase.auth.signOut();
          setIsLoading(false);
          return;
        }
        
        setSession(session);
        if (session?.user) {
          setTimeout(() => {
            loadUserData(session.user);
          }, 0);
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Fatal auth error:', error);
        await supabase.auth.signOut();
        setIsLoading(false);
      }
    };

    initializeAuth();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkIfAdmin = async (userId: string) => {
    const { data } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .maybeSingle();
    
    return !!data;
  };

  const loadUserData = async (supabaseUser: SupabaseUser) => {
    // Debounce: não recarregar se recarregou recentemente
    const now = Date.now();
    if (now - lastReloadTime < RELOAD_DEBOUNCE_MS) {
      console.log('Skipping reload - debounced');
      setIsLoading(false);
      return;
    }

    // Verificar cache
    if (dataCache && now - dataCache.timestamp < CACHE_VALIDITY_MS) {
      console.log('Using cached user data');
      setUser(dataCache.user);
      setTeam(dataCache.team);
      setIsLoading(false);
      return;
    }

    try {
      setLastReloadTime(now);
      
      // Load profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();

      if (profile) {
        const isTeamAdmin = await checkIfAdmin(supabaseUser.id);
        
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
            
            // Calculate trial expiration
            const nowDate = new Date();
            const periodEnd = teamData.subscription_period_end ? new Date(teamData.subscription_period_end) : null;
            const daysRemaining = periodEnd ? Math.ceil((periodEnd.getTime() - nowDate.getTime()) / (1000 * 60 * 60 * 24)) : null;
            const isExpired = teamData.plan_id === 'free' && periodEnd && periodEnd < nowDate;
            
            setIsTrialExpired(isExpired || false);
            setTrialDaysRemaining(daysRemaining);
            
            const loadedTeam = {
              id: teamData.id,
              name: teamData.name,
              code: teamData.code,
              admin: teamData.admin_id,
              admin_id: teamData.admin_id,
              subscription_period_end: teamData.subscription_period_end,
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
            };

            setTeam(loadedTeam);

            // Atualizar cache com dados carregados
            setDataCache({
              timestamp: now,
              user: {
                id: profile.id,
                email: profile.email,
                name: profile.name,
                teamId: profile.team_id,
                isAdmin: isTeamAdmin
              },
              team: loadedTeam
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
    await supabase.auth.signOut();
    setUser(null);
    setTeam(null);
  };

  const refreshProfile = async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (currentSession?.user) {
      await loadUserData(currentSession.user);
    }
  };

  return {
    user,
    session,
    team,
    isAuthenticated: !!user,
    isLoading,
    isTrialExpired,
    trialDaysRemaining,
    logout,
    reloadUserData,
    refreshProfile,
  };
}
