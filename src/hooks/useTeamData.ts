import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
}

interface JoinRequest {
  id: string;
  name: string;
  email: string;
  created_at: string;
  avatar_url?: string;
}

interface TeamData {
  id: string;
  name: string;
  code: string;
  admin_id: string;
  plan_id: string;
  isMyTeam: boolean;
}

export const useAccessibleTeams = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['accessible-teams', user?.id],
    queryFn: async (): Promise<TeamData[]> => {
      if (!user) return [];

      const { data: myProfile } = await supabase
        .from('profiles')
        .select('team_id')
        .eq('id', user.id)
        .single();

      const teams: TeamData[] = [];

      if (myProfile?.team_id) {
        const { data: myTeamData } = await supabase
          .from('teams')
          .select('id, name, code, admin_id, plan_id')
          .eq('id', myProfile.team_id)
          .single();

        if (myTeamData) {
          teams.push({ ...myTeamData, isMyTeam: true });
        }
      }

      const { data: memberOf } = await supabase
        .from('team_members')
        .select(`team_id, teams:team_id (id, name, code, admin_id, plan_id)`)
        .eq('user_id', user.id);

      if (memberOf) {
        for (const membership of memberOf) {
          const teamData = membership.teams as unknown as TeamData;
          if (teamData && !teams.find(t => t.id === teamData.id)) {
            teams.push({ ...teamData, isMyTeam: false });
          }
        }
      }

      return teams;
    },
    enabled: !!user,
    staleTime: 1000 * 60 * 5,
  });
};

export const useTeamMembers = (teamId: string | undefined) => {
  return useQuery({
    queryKey: ['team-members', teamId],
    queryFn: async (): Promise<TeamMember[]> => {
      if (!teamId) return [];

      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, email, avatar_url')
        .eq('team_id', teamId);

      if (error) throw error;
      return data || [];
    },
    enabled: !!teamId,
    staleTime: 1000 * 60 * 5,
  });
};

export const usePendingRequests = (teamId: string | undefined, isAdmin: boolean) => {
  return useQuery({
    queryKey: ['pending-requests', teamId],
    queryFn: async (): Promise<JoinRequest[]> => {
      if (!teamId) return [];

      const { data: requestsData, error } = await supabase
        .from('team_join_requests')
        .select('id, user_id, created_at')
        .eq('team_id', teamId)
        .eq('status', 'pending');

      if (error) throw error;
      if (!requestsData || requestsData.length === 0) return [];

      const userIds = requestsData.map((req: any) => req.user_id);
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, name, email, avatar_url')
        .in('id', userIds);

      const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);

      return requestsData.map((req: any) => {
        const profile = profilesMap.get(req.user_id);
        return {
          id: req.id,
          name: profile?.name || 'Usuário',
          email: profile?.email || '',
          avatar_url: profile?.avatar_url || '',
          created_at: req.created_at,
        };
      });
    },
    enabled: !!teamId && isAdmin,
    staleTime: 1000 * 60 * 2,
  });
};

export const useInvalidateTeamData = () => {
  const queryClient = useQueryClient();

  return {
    invalidateMembers: (teamId?: string) => {
      queryClient.invalidateQueries({ queryKey: ['team-members', teamId] });
    },
    invalidateRequests: (teamId?: string) => {
      queryClient.invalidateQueries({ queryKey: ['pending-requests', teamId] });
    },
    invalidateTeams: () => {
      queryClient.invalidateQueries({ queryKey: ['accessible-teams'] });
    },
    invalidateAll: (teamId?: string) => {
      queryClient.invalidateQueries({ queryKey: ['accessible-teams'] });
      queryClient.invalidateQueries({ queryKey: ['team-members', teamId] });
      queryClient.invalidateQueries({ queryKey: ['pending-requests', teamId] });
    },
  };
};
