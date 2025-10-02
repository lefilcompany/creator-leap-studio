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
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        
        // Defer Supabase calls with setTimeout to prevent deadlock
        if (session?.user) {
          setTimeout(() => {
            loadUserData(session.user);
          }, 0);
        } else {
          setUser(null);
          setTeam(null);
          setIsLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        setTimeout(() => {
          loadUserData(session.user);
        }, 0);
      } else {
        setIsLoading(false);
      }
    });

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
      .single();
    
    return !!data;
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
