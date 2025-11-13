import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User as SupabaseUser } from '@supabase/supabase-js';
import type { Session } from '@supabase/supabase-js';

interface User {
  id: string;
  email: string;
  name: string;
  teamId?: string;
  isAdmin: boolean;
  avatarUrl?: string;
}

interface Team {
  id: string;
  name: string;
  code?: string;
  admin: string;
  admin_id?: string;
  plan_id: string;
  subscription_status: string;
  subscription_period_end?: string;
  plan: {
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
  };
  credits: number; // Créditos unificados da equipe
  free_brands_used: number;
  free_personas_used: number;
  free_themes_used: number;
}

interface DataCache {
  timestamp: number;
  user: User | null;
  team: Team | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  team: Team | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isTrialExpired: boolean;
  trialDaysRemaining: number | null;
  logout: () => Promise<void>;
  reloadUserData: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshTeamData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const RELOAD_DEBOUNCE_MS = 1000; // Reduzido para 1s
const CACHE_VALIDITY_MS = 60000;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isTrialExpired, setIsTrialExpired] = useState(false);
  const [trialDaysRemaining, setTrialDaysRemaining] = useState<number | null>(null);
  
  const lastReloadTime = useRef<number>(0);
  const dataCache = useRef<DataCache | null>(null);
  const isMounted = useRef(true);
  const isInitialized = useRef(false);
  const isInitialLoad = useRef(true);
  const abortControllerRef = useRef<AbortController | null>(null);

  const checkIfAdmin = useCallback(async (userId: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .eq('role', 'admin')
        .maybeSingle();

      if (error) {
        console.error('Error checking admin status:', error);
        return false;
      }

      return !!data;
    } catch (error) {
      console.error('Error in checkIfAdmin:', error);
      return false;
    }
  }, []);

  const loadUserData = useCallback(async (supabaseUser: SupabaseUser, forceLoad = false) => {
    const now = Date.now();
    
    // Permitir load inicial sempre, ignorar debounce
    const shouldSkipDebounce = isInitialLoad.current || forceLoad;
    
    if (!shouldSkipDebounce && now - lastReloadTime.current < RELOAD_DEBOUNCE_MS) {
      console.log('[AuthContext] Skipping reload - debounced');
      setIsLoading(false);
      return;
    }

    // Usar cache apenas se não for load inicial e não for force
    if (!shouldSkipDebounce && dataCache.current && now - dataCache.current.timestamp < CACHE_VALIDITY_MS) {
      console.log('[AuthContext] Using cached user data');
      setUser(dataCache.current.user);
      setTeam(dataCache.current.team);
      setIsLoading(false);
      return;
    }

    // Cancelar requisição anterior se existir
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      lastReloadTime.current = now;
      isInitialLoad.current = false; // Marcar que já não é inicial
      console.log('[AuthContext] Loading user data for:', supabaseUser.id);

      const [profileResult, isAdmin] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', supabaseUser.id).maybeSingle(),
        checkIfAdmin(supabaseUser.id)
      ]);

      if (!isMounted.current) return;

      const { data: profile, error: profileError } = profileResult;

      if (profileError) {
        console.error('[AuthContext] Error fetching profile:', profileError);
        setIsLoading(false);
        return;
      }

      if (!profile) {
        console.log('[AuthContext] No profile found');
        setUser(null);
        setTeam(null);
        setIsLoading(false);
        return;
      }

      const userData: User = {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        name: profile.name || profile.email || '',
        teamId: profile.team_id,
        isAdmin,
        avatarUrl: profile.avatar_url
      };

      let teamData: Team | null = null;
      let trialExpired = false;
      let daysRemaining: number | null = null;

      if (profile.team_id) {
        const { data: teamInfo, error: teamError } = await supabase
          .from('teams')
          .select(`
            *,
            plans (*)
          `)
          .eq('id', profile.team_id)
          .maybeSingle();

        if (!isMounted.current) return;

        if (teamError) {
          console.error('[AuthContext] Error fetching team:', teamError);
        } else if (teamInfo && teamInfo.plans) {
          const planData = teamInfo.plans as any;
          
          // Calculate trial expiration
          const nowDate = new Date();
          const periodEnd = teamInfo.subscription_period_end ? new Date(teamInfo.subscription_period_end) : null;
          const calculatedDaysRemaining = periodEnd ? Math.ceil((periodEnd.getTime() - nowDate.getTime()) / (1000 * 60 * 60 * 24)) : null;
          const isExpired = teamInfo.plan_id === 'free' && periodEnd && periodEnd < nowDate;
          
          trialExpired = isExpired || false;
          daysRemaining = calculatedDaysRemaining;

          teamData = {
            id: teamInfo.id,
            name: teamInfo.name,
            code: teamInfo.code,
            admin: teamInfo.admin_id,
            admin_id: teamInfo.admin_id,
            plan_id: teamInfo.plan_id,
            subscription_status: teamInfo.subscription_status,
            subscription_period_end: teamInfo.subscription_period_end,
            plan: {
              id: planData.id,
              name: planData.name,
              description: planData.description || '',
              price: planData.price_monthly || 0,
              credits: planData.credits || 0,
              maxMembers: planData.max_members,
              maxBrands: planData.max_brands,
              maxStrategicThemes: planData.max_strategic_themes,
              maxPersonas: planData.max_personas,
              trialDays: planData.trial_days,
              isActive: planData.is_active,
            },
            credits: teamInfo.credits || 0,
            free_brands_used: teamInfo.free_brands_used || 0,
            free_personas_used: teamInfo.free_personas_used || 0,
            free_themes_used: teamInfo.free_themes_used || 0,
          };
        }
      }

      if (!isMounted.current) return;

      dataCache.current = {
        timestamp: now,
        user: userData,
        team: teamData
      };

      setUser(userData);
      setTeam(teamData);
      setIsTrialExpired(trialExpired);
      setTrialDaysRemaining(daysRemaining);
    } catch (error) {
      console.error('[AuthContext] Error loading user data:', error);
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, [checkIfAdmin]);

  const reloadUserData = useCallback(async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    if (currentSession?.user) {
      dataCache.current = null;
      lastReloadTime.current = 0;
      await loadUserData(currentSession.user, true); // Force load
    }
  }, [loadUserData]);

  const refreshProfile = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('[AuthContext] Error refreshing profile:', error);
        return;
      }

      if (profile && isMounted.current) {
        setUser(prev => prev ? {
          ...prev,
          name: profile.name || profile.email || prev.name,
          teamId: profile.team_id,
          avatarUrl: profile.avatar_url
        } : null);

        dataCache.current = null;
      }
    } catch (error) {
      console.error('[AuthContext] Error in refreshProfile:', error);
    }
  }, [user?.id]);

  const logout = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setTeam(null);
      setSession(null);
      setIsTrialExpired(false);
      setTrialDaysRemaining(null);
      dataCache.current = null;
      lastReloadTime.current = 0;
    } catch (error) {
      console.error('[AuthContext] Error during logout:', error);
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    let mounted = true;

    console.log('[AuthContext] Initializing auth listener');

    const initializeAuth = async () => {
      try {
        setIsLoading(true);
        console.log('[AuthContext] 🔍 [INIT] Checking localStorage for session...');
        
        const storageKeys = Object.keys(localStorage).filter(key => 
          key.includes('supabase') || key.includes('auth')
        );
        console.log('[AuthContext] 📦 [INIT] Storage keys found:', storageKeys);
        
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[AuthContext] ❌ [INIT] Error getting session:', error);
        }
        
        if (!mounted) return;

        if (currentSession) {
          console.log('[AuthContext] ✅ [INIT] Session found in localStorage');
          console.log('[AuthContext] 🔑 [INIT] Access token:', currentSession.access_token?.substring(0, 20) + '...');
          console.log('[AuthContext] 👤 [INIT] User ID:', currentSession.user?.id);
          console.log('[AuthContext] ⏰ [INIT] Expires at:', new Date(currentSession.expires_at! * 1000).toLocaleString());
        } else {
          console.log('[AuthContext] ❌ [INIT] No session found in localStorage');
        }
        
        setSession(currentSession);

        if (currentSession?.user) {
          console.log('[AuthContext] 🚀 [INIT] Loading user data from cached session');
          isInitialized.current = true;
          // isInitialLoad é true, então vai carregar sem debounce
          await loadUserData(currentSession.user, true);
        } else {
          console.log('[AuthContext] ⚠️ [INIT] No user in session, setting loading to false');
          setIsLoading(false);
        }
      } catch (error) {
        console.error('[AuthContext] ❌ [INIT] Error initializing auth:', error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    // Initialize auth state from localStorage first
    initializeAuth();

    // Then set up the listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log('[AuthContext] 🔔 [EVENT] Auth event:', event);
        
        if (!mounted) {
          console.log('[AuthContext] ⚠️ [EVENT] Component unmounted, skipping event');
          return;
        }

        // Handle TOKEN_REFRESHED - apenas atualiza sessão, mantém dados do usuário
        if (event === 'TOKEN_REFRESHED') {
          console.log('[AuthContext] 🔄 [TOKEN_REFRESHED] Token refreshed - updating session only');
          if (newSession) {
            console.log('[AuthContext] 🔑 [TOKEN_REFRESHED] New token:', newSession.access_token?.substring(0, 20) + '...');
          }
          setSession(newSession);
          return;
        }

        // Handle SIGNED_OUT
        if (event === 'SIGNED_OUT') {
          console.log('[AuthContext] 👋 [SIGNED_OUT] User signed out - clearing all state');
          setSession(null);
          setUser(null);
          setTeam(null);
          setIsTrialExpired(false);
          setTrialDaysRemaining(null);
          setIsLoading(false);
          dataCache.current = null;
          isInitialized.current = false;
          isInitialLoad.current = true; // Reset para próximo login
          return;
        }

        // Handle SIGNED_IN - apenas se não foi inicializado ainda
        if (event === 'SIGNED_IN') {
          console.log('[AuthContext] 👤 [SIGNED_IN] User signed in');
          
          // Evitar processar SIGNED_IN se já inicializamos
          if (isInitialized.current) {
            console.log('[AuthContext] ⏭️ [SIGNED_IN] Already initialized, skipping duplicate load');
            setSession(newSession);
            return;
          }
          
          setSession(newSession);
          
          if (newSession?.user) {
            console.log('[AuthContext] ✅ [SIGNED_IN] User data available, loading...');
            isInitialized.current = true;
            // Usar setTimeout para evitar deadlock
            setTimeout(() => {
              if (mounted) {
                loadUserData(newSession.user, true);
              }
            }, 0);
          } else {
            console.log('[AuthContext] ❌ [SIGNED_IN] No user data in session');
            setUser(null);
            setTeam(null);
            setIsLoading(false);
          }
          return;
        }

        // Handle INITIAL_SESSION - já foi tratado em initializeAuth
        if (event === 'INITIAL_SESSION') {
          console.log('[AuthContext] ⏭️ [INITIAL_SESSION] Skipping (already handled in init)');
          return;
        }

        // Outros eventos
        console.log('[AuthContext] 📝 [OTHER] Other event, updating session only');
        setSession(newSession);
      }
    );

    return () => {
      console.log('[AuthContext] 🧹 [CLEANUP] Cleanup - unsubscribing');
      mounted = false;
      isMounted.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      subscription.unsubscribe();
    };
  }, [loadUserData]);

  const isAuthenticated = useMemo(() => !!session && !!user, [session, user]);

  const refreshTeamData = useCallback(async () => {
    if (!user?.teamId) {
      console.log('[AuthContext] Cannot refresh team data - no team ID');
      return;
    }

    try {
      console.log('[AuthContext] 🔄 Refreshing team data...');
      
      const { data: teamData, error } = await supabase
        .from('teams')
        .select(`
          *,
          plan:plans(*)
        `)
        .eq('id', user.teamId)
        .single();

      if (error) {
        console.error('[AuthContext] Error refreshing team data:', error);
        return;
      }

      if (teamData) {
        setTeam({
          id: teamData.id,
          name: teamData.name,
          code: teamData.code,
          admin: teamData.admin_id,
          admin_id: teamData.admin_id,
          plan_id: teamData.plan_id,
          subscription_status: teamData.subscription_status,
          subscription_period_end: teamData.subscription_period_end,
          plan: {
            id: teamData.plan.id,
            name: teamData.plan.name,
            description: teamData.plan.description || '',
            price: teamData.plan.price_monthly,
            credits: teamData.plan.credits || 0,
            maxMembers: teamData.plan.max_members,
            maxBrands: teamData.plan.max_brands,
            maxStrategicThemes: teamData.plan.max_strategic_themes,
            maxPersonas: teamData.plan.max_personas,
            trialDays: teamData.plan.trial_days,
            isActive: teamData.plan.is_active
          },
          credits: teamData.credits || 0,
          free_brands_used: teamData.free_brands_used || 0,
          free_personas_used: teamData.free_personas_used || 0,
          free_themes_used: teamData.free_themes_used || 0,
        });
        console.log('[AuthContext] ✅ Team data refreshed successfully');
      }
    } catch (error) {
      console.error('[AuthContext] Error in refreshTeamData:', error);
    }
  }, [user?.teamId]);

  const value = useMemo(
    () => ({
      user,
      session,
      team,
      isAuthenticated,
      isLoading,
      isTrialExpired,
      trialDaysRemaining,
      logout,
      reloadUserData,
      refreshProfile,
      refreshTeamData
    }),
    [user, session, team, isAuthenticated, isLoading, isTrialExpired, trialDaysRemaining, logout, reloadUserData, refreshProfile, refreshTeamData]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
