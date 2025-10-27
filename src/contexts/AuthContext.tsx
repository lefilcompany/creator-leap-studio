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
    displayName: string;
    price: number;
    trialDays: number;
    maxMembers: number;
    maxBrands: number;
    maxStrategicThemes: number;
    maxPersonas: number;
    quickContentCreations: number;
    customContentSuggestions: number;
    contentPlans: number;
    contentReviews: number;
    isActive: boolean;
  };
  credits?: {
    quickContentCreations: number;
    contentSuggestions: number;
    contentReviews: number;
    contentPlans: number;
  };
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const RELOAD_DEBOUNCE_MS = 5000;
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

  const loadUserData = useCallback(async (supabaseUser: SupabaseUser) => {
    const now = Date.now();
    
    if (now - lastReloadTime.current < RELOAD_DEBOUNCE_MS) {
      console.log('[AuthContext] Skipping reload - debounced');
      setIsLoading(false);
      return;
    }

    if (dataCache.current && now - dataCache.current.timestamp < CACHE_VALIDITY_MS) {
      console.log('[AuthContext] Using cached user data');
      setUser(dataCache.current.user);
      setTeam(dataCache.current.team);
      setIsLoading(false);
      return;
    }

    try {
      lastReloadTime.current = now;
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
              quickContentCreations: teamInfo.credits_quick_content,
              contentSuggestions: teamInfo.credits_suggestions,
              contentReviews: teamInfo.credits_reviews,
              contentPlans: teamInfo.credits_plans,
            }
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
      await loadUserData(currentSession.user);
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
        console.log('[AuthContext] 🔍 Checking localStorage for session...');
        
        // Check what's in localStorage
        const storageKeys = Object.keys(localStorage).filter(key => 
          key.includes('supabase') || key.includes('auth')
        );
        console.log('[AuthContext] 📦 Storage keys found:', storageKeys);
        
        // First, get the session from localStorage
        const { data: { session: currentSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('[AuthContext] ❌ Error getting session:', error);
        }
        
        if (!mounted) return;

        if (currentSession) {
          console.log('[AuthContext] ✅ Session found in localStorage');
          console.log('[AuthContext] 🔑 Access token:', currentSession.access_token?.substring(0, 20) + '...');
          console.log('[AuthContext] 👤 User ID:', currentSession.user?.id);
          console.log('[AuthContext] ⏰ Expires at:', new Date(currentSession.expires_at! * 1000).toLocaleString());
        } else {
          console.log('[AuthContext] ❌ No session found in localStorage');
        }
        
        setSession(currentSession);

        if (currentSession?.user) {
          console.log('[AuthContext] Loading user data from cached session');
          isInitialized.current = true;
          await loadUserData(currentSession.user);
        } else {
          console.log('[AuthContext] No user in session, setting loading to false');
          setIsLoading(false);
        }
      } catch (error) {
        console.error('[AuthContext] ❌ Error initializing auth:', error);
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
        console.log('[AuthContext] 🔔 Auth event:', event);
        
        if (event === 'SIGNED_OUT') {
          console.log('[AuthContext] ⚠️ SIGNED_OUT event triggered!');
          console.trace('[AuthContext] Stack trace for SIGNED_OUT');
        }

        if (!mounted) return;

        if (event === 'TOKEN_REFRESHED') {
          console.log('[AuthContext] 🔄 Token refreshed - updating session');
          if (newSession) {
            console.log('[AuthContext] 🔑 New token:', newSession.access_token?.substring(0, 20) + '...');
          }
          setSession(newSession);
          return;
        }

        if (event === 'SIGNED_OUT') {
          console.log('[AuthContext] 👋 User signed out - clearing state');
          setSession(null);
          setUser(null);
          setTeam(null);
          setIsTrialExpired(false);
          setTrialDaysRemaining(null);
          setIsLoading(false);
          dataCache.current = null;
          isInitialized.current = false;
          return;
        }

        if (event === 'SIGNED_IN') {
          console.log('[AuthContext] 👤 User signed in');
          setSession(newSession);
          
          if (newSession?.user) {
            console.log('[AuthContext] ✅ User data available, loading...');
            isInitialized.current = true;
            loadUserData(newSession.user);
          } else {
            console.log('[AuthContext] ❌ No user data in session');
            setUser(null);
            setTeam(null);
            setIsLoading(false);
          }
        } else if (event === 'INITIAL_SESSION') {
          // Skip INITIAL_SESSION since we already handled it in initializeAuth
          console.log('[AuthContext] ⏭️ Skipping INITIAL_SESSION event (already handled)');
        } else {
          console.log('[AuthContext] 📝 Other event, updating session');
          setSession(newSession);
        }
      }
    );

    return () => {
      console.log('[AuthContext] Cleanup - unsubscribing');
      mounted = false;
      isMounted.current = false;
      subscription.unsubscribe();
    };
  }, [loadUserData]);

  const isAuthenticated = useMemo(() => !!session && !!user, [session, user]);

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
      refreshProfile
    }),
    [user, session, team, isAuthenticated, isLoading, isTrialExpired, trialDaysRemaining, logout, reloadUserData, refreshProfile]
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
