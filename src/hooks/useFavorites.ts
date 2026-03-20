import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export type FavoriteScope = 'personal' | 'team';

interface FavoriteEntry {
  action_id: string;
  scope: string;
  team_id: string | null;
  user_id: string;
}

export function useFavorites() {
  const { user, team } = useAuth();
  const queryClient = useQueryClient();

  const { data: favorites = [], isLoading } = useQuery({
    queryKey: ['action-favorites', user?.id, team?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('action_favorites')
        .select('action_id, scope, team_id, user_id');
      if (error) throw error;
      return (data || []) as FavoriteEntry[];
    },
    enabled: !!user?.id,
  });

  const personalFavoriteIds = favorites
    .filter(f => f.scope === 'personal' && f.user_id === user?.id)
    .map(f => f.action_id);

  const teamFavoriteIds = favorites
    .filter(f => f.scope === 'team' && f.team_id === team?.id)
    .map(f => f.action_id);

  const allFavoriteIds = [...new Set([...personalFavoriteIds, ...teamFavoriteIds])];

  const toggleFavorite = useMutation({
    mutationFn: async ({ actionId, scope }: { actionId: string; scope: FavoriteScope }) => {
      const existing = favorites.find(
        f => f.action_id === actionId && f.scope === scope && f.user_id === user!.id
      );
      if (existing) {
        const { error } = await supabase
          .from('action_favorites')
          .delete()
          .eq('user_id', user!.id)
          .eq('action_id', actionId)
          .eq('scope', scope);
        if (error) throw error;
      } else {
        const insert: any = {
          user_id: user!.id,
          action_id: actionId,
          scope,
        };
        if (scope === 'team' && team?.id) {
          insert.team_id = team.id;
        }
        const { error } = await supabase
          .from('action_favorites')
          .insert(insert);
        if (error) throw error;
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['action-favorites'] });
    },
  });

  return {
    favorites,
    personalFavoriteIds,
    teamFavoriteIds,
    allFavoriteIds,
    isLoading,
    isFavorite: (actionId: string) => allFavoriteIds.includes(actionId),
    isPersonalFavorite: (actionId: string) => personalFavoriteIds.includes(actionId),
    isTeamFavorite: (actionId: string) => teamFavoriteIds.includes(actionId),
    toggleFavorite: (actionId: string, scope: FavoriteScope = 'personal') =>
      toggleFavorite.mutate({ actionId, scope }),
    hasTeam: !!team?.id,
  };
}

export function useTeamFavorites(teamId: string | undefined) {
  return useQuery({
    queryKey: ['action-favorites', 'team', teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('action_favorites')
        .select('action_id, user_id, created_at')
        .eq('scope', 'team')
        .eq('team_id', teamId!);
      if (error) throw error;
      return data || [];
    },
    enabled: !!teamId,
  });
}
