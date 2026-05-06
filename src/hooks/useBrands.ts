import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type BrandRow = Tables<'brands'>;
export type BrandInsert = TablesInsert<'brands'>;
export type BrandUpdate = TablesUpdate<'brands'>;

export const useBrands = () => {
  const { user, team } = useAuth();
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['brands', currentWorkspace?.id, team?.id, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      let query = supabase.from('brands').select('*').order('name');
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
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });
};

export const useBrand = (brandId: string | undefined) => {
  return useQuery({
    queryKey: ['brand', brandId],
    queryFn: async () => {
      if (!brandId) return null;
      const { data, error } = await supabase.from('brands').select('*').eq('id', brandId).single();
      if (error) throw error;
      return data;
    },
    enabled: !!brandId,
    staleTime: 1000 * 60 * 5,
  });
};

export const useCreateBrand = () => {
  const queryClient = useQueryClient();
  const { user, team } = useAuth();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (brand: Omit<BrandInsert, 'user_id' | 'team_id' | 'workspace_id'>) => {
      if (!user?.id) throw new Error('User not authenticated');
      const { data, error } = await supabase
        .from('brands')
        .insert({
          ...brand,
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
      queryClient.invalidateQueries({ queryKey: ['brands'] });
    },
  });
};

export const useUpdateBrand = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...brand }: BrandUpdate & { id: string }) => {
      const { data, error } = await supabase.from('brands').update(brand).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
      queryClient.invalidateQueries({ queryKey: ['brand', variables.id] });
    },
  });
};

export const useDeleteBrand = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (brandId: string) => {
      const { error } = await supabase.from('brands').delete().eq('id', brandId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['brands'] });
    },
  });
};
