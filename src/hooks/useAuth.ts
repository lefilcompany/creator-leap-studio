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

    return () => subscription.unsubscribe();
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
            .select('*')
            .eq('id', profile.team_id)
            .single();

          if (teamData) {
            setTeam({
              id: teamData.id,
              name: teamData.name,
              code: teamData.code,
              admin: teamData.admin_id,
              plan: {
                id: teamData.plan_id,
                name: teamData.plan_id.toUpperCase(),
                displayName: teamData.plan_id === 'pro' ? 'Premium' : 'Free',
                price: 0,
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
