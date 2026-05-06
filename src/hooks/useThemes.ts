import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type ThemeRow = Tables<'strategic_themes'>;
export type ThemeInsert = TablesInsert<'strategic_themes'>;
export type ThemeUpdate = TablesUpdate<'strategic_themes'>;

export const useThemes = (brandId?: string) => {
  const { user, team } = useAuth();
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['themes', currentWorkspace?.id, team?.id, user?.id, brandId],
    queryFn: async () => {
      if (!user?.id) return [];
      let query = supabase.from('strategic_themes').select('*').order('title');

      if (currentWorkspace?.id) {
        query = query.or(
          `workspace_id.eq.${currentWorkspace.id}` +
          (team?.id ? `,team_id.eq.${team.id}` : '') +
          `,user_id.eq.${user.id}`
        );
      } else if (team?.id) {
        query = query.eq('team_id', team.id);
      } else {
        query = query.eq('user_id', user.id);
      }

      if (brandId) query = query.eq('brand_id', brandId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });
};

export const useTheme = (themeId: string | undefined) => {
  return useQuery({
    queryKey: ['theme', themeId],
    queryFn: async () => {
      if (!themeId) return null;
      const { data, error } = await supabase.from('strategic_themes').select('*').eq('id', themeId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!themeId,
    staleTime: 1000 * 60 * 5,
  });
};

export const useCreateTheme = () => {
  const queryClient = useQueryClient();
  const { user, team } = useAuth();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (theme: Omit<ThemeInsert, 'user_id' | 'team_id' | 'workspace_id'>) => {
      if (!user?.id) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('strategic_themes')
        .insert({
          ...theme,
          user_id: user.id,
          team_id: team?.id,
          workspace_id: currentWorkspace?.id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['themes'] });
    },
  });
};

export const useUpdateTheme = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...theme }: ThemeUpdate & { id: string }) => {
      const { data, error } = await supabase.from('strategic_themes').update(theme).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['themes'] });
      queryClient.invalidateQueries({ queryKey: ['theme', variables.id] });
    },
  });
};

export const useDeleteTheme = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (themeId: string) => {
      const { error } = await supabase.from('strategic_themes').delete().eq('id', themeId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['themes'] });
    },
  });
};
