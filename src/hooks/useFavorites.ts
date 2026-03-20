import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useFavorites() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: favoriteIds = [], isLoading } = useQuery({
    queryKey: ['action-favorites', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('action_favorites')
        .select('action_id')
        .eq('user_id', user!.id);
      if (error) throw error;
      return (data || []).map((r: any) => r.action_id as string);
    },
    enabled: !!user?.id,
  });

  const toggleFavorite = useMutation({
    mutationFn: async (actionId: string) => {
      const isFav = favoriteIds.includes(actionId);
      if (isFav) {
        const { error } = await supabase
          .from('action_favorites')
          .delete()
          .eq('user_id', user!.id)
          .eq('action_id', actionId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('action_favorites')
          .insert({ user_id: user!.id, action_id: actionId });
        if (error) throw error;
      }
    },
    onMutate: async (actionId: string) => {
      await queryClient.cancelQueries({ queryKey: ['action-favorites', user?.id] });
      const prev = queryClient.getQueryData<string[]>(['action-favorites', user?.id]) || [];
      const next = prev.includes(actionId) ? prev.filter(id => id !== actionId) : [...prev, actionId];
      queryClient.setQueryData(['action-favorites', user?.id], next);
      return { prev };
    },
    onError: (_err, _actionId, context) => {
      if (context?.prev) {
        queryClient.setQueryData(['action-favorites', user?.id], context.prev);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['action-favorites', user?.id] });
    },
  });

  return {
    favoriteIds,
    isLoading,
    isFavorite: (actionId: string) => favoriteIds.includes(actionId),
    toggleFavorite: (actionId: string) => toggleFavorite.mutate(actionId),
  };
}
