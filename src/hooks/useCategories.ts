import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { ActionCategory, CategoryWithCount } from '@/types/category';

export function useCategories() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const categoriesQuery = useQuery({
    queryKey: ['categories', user?.id],
    queryFn: async () => {
      const { data: categories, error } = await supabase
        .from('action_categories')
        .select('*')
        .order('name');
      if (error) throw error;

      // Get item counts
      const { data: items, error: itemsError } = await supabase
        .from('action_category_items')
        .select('category_id');
      if (itemsError) throw itemsError;

      const countMap: Record<string, number> = {};
      (items || []).forEach((item: any) => {
        countMap[item.category_id] = (countMap[item.category_id] || 0) + 1;
      });

      return (categories || []).map((c: any) => ({
        ...c,
        action_count: countMap[c.id] || 0,
      })) as CategoryWithCount[];
    },
    enabled: !!user?.id,
  });

  const createCategory = useMutation({
    mutationFn: async (data: { name: string; description?: string; color: string; visibility: 'personal' | 'team' }) => {
      const { data: result, error } = await supabase
        .from('action_categories')
        .insert({
          name: data.name,
          description: data.description || null,
          color: data.color,
          visibility: data.visibility,
          user_id: user!.id,
          team_id: user?.teamId || null,
        })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Categoria criada com sucesso!');
    },
    onError: () => toast.error('Erro ao criar categoria'),
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name: string; description?: string; color: string; visibility: 'personal' | 'team' }) => {
      const { error } = await supabase
        .from('action_categories')
        .update({ name: data.name, description: data.description || null, color: data.color, visibility: data.visibility })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Categoria atualizada!');
    },
    onError: () => toast.error('Erro ao atualizar categoria'),
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('action_categories').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Categoria excluída!');
    },
    onError: () => toast.error('Erro ao excluir categoria'),
  });

  const addActionToCategory = useMutation({
    mutationFn: async ({ categoryId, actionId }: { categoryId: string; actionId: string }) => {
      const { error } = await supabase
        .from('action_category_items')
        .insert({ category_id: categoryId, action_id: actionId, added_by: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['action-categories'] });
      toast.success('Ação adicionada à categoria!');
    },
    onError: () => toast.error('Erro ao adicionar à categoria'),
  });

  const removeActionFromCategory = useMutation({
    mutationFn: async ({ categoryId, actionId }: { categoryId: string; actionId: string }) => {
      const { error } = await supabase
        .from('action_category_items')
        .delete()
        .eq('category_id', categoryId)
        .eq('action_id', actionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['action-categories'] });
      toast.success('Ação removida da categoria!');
    },
    onError: () => toast.error('Erro ao remover da categoria'),
  });

  return {
    categories: categoriesQuery.data || [],
    isLoading: categoriesQuery.isLoading,
    createCategory,
    updateCategory,
    deleteCategory,
    addActionToCategory,
    removeActionFromCategory,
  };
}

/** Get categories for a specific action */
export function useActionCategories(actionId: string | undefined) {
  return useQuery({
    queryKey: ['action-categories', actionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('action_category_items')
        .select('category_id, action_categories(id, name, color)')
        .eq('action_id', actionId!);
      if (error) throw error;
      return (data || []).map((item: any) => item.action_categories).filter(Boolean) as Array<{ id: string; name: string; color: string }>;
    },
    enabled: !!actionId,
  });
}
