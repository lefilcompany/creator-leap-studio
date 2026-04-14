import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { ActionCategory, CategoryWithCount } from '@/types/category';

export interface CategoryMemberInput {
  userId: string;
  role: 'viewer' | 'editor';
}

export interface CategoryMemberWithProfile {
  id: string;
  user_id: string;
  role: string;
  name: string;
  email: string;
  avatar_url: string | null;
}

export function useCategories() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const categoriesQuery = useQuery({
    queryKey: ['categories', user?.id],
    queryFn: async () => {
      // Fetch categories I own
      const { data: ownCategories, error } = await supabase
        .from('action_categories')
        .select('*')
        .eq('user_id', user!.id)
        .order('name');
      if (error) throw error;

      // Fetch categories shared with me (where I'm a member but not owner)
      const { data: memberEntries, error: memberError } = await supabase
        .from('action_category_members')
        .select('category_id, role')
        .eq('user_id', user!.id);
      if (memberError) throw memberError;

      const editorEntries = (memberEntries || []).filter((m: any) => m.role === 'editor');
      const sharedCategoryIds = editorEntries
        .map((m: any) => m.category_id)
        .filter((id: string) => !(ownCategories || []).some((c: any) => c.id === id));

      let sharedCategories: any[] = [];
      if (sharedCategoryIds.length > 0) {
        const { data, error: sharedError } = await supabase
          .from('action_categories')
          .select('*')
          .in('id', sharedCategoryIds)
          .order('name');
        if (sharedError) throw sharedError;
        sharedCategories = data || [];
      }

      const allCategories = [...(ownCategories || []), ...sharedCategories];

      // Get item counts
      const categoryIds = allCategories.map(c => c.id);
      let countMap: Record<string, number> = {};
      let memberCountMap: Record<string, number> = {};
      if (categoryIds.length > 0) {
        const { data: items, error: itemsError } = await supabase
          .from('action_category_items')
          .select('category_id')
          .in('category_id', categoryIds);
        if (itemsError) throw itemsError;
        (items || []).forEach((item: any) => {
          countMap[item.category_id] = (countMap[item.category_id] || 0) + 1;
        });

        // Get member counts
        const { data: memberItems, error: membersError } = await supabase
          .from('action_category_members')
          .select('category_id')
          .in('category_id', categoryIds);
        if (membersError) throw membersError;
        (memberItems || []).forEach((item: any) => {
          memberCountMap[item.category_id] = (memberCountMap[item.category_id] || 0) + 1;
        });
      }

      return allCategories.map((c: any) => ({
        ...c,
        action_count: countMap[c.id] || 0,
        member_count: memberCountMap[c.id] || 0,
      })) as CategoryWithCount[];
    },
    enabled: !!user?.id,
  });

  // Realtime subscription for action_categories changes
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('categories-realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'action_categories',
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['categories'] });
          // Also invalidate individual category queries for CategoryView
          if (payload.new && typeof payload.new === 'object' && 'id' in payload.new) {
            queryClient.invalidateQueries({ queryKey: ['category', (payload.new as any).id] });
          }
          if (payload.old && typeof payload.old === 'object' && 'id' in payload.old) {
            queryClient.invalidateQueries({ queryKey: ['category', (payload.old as any).id] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const myCategories = (categoriesQuery.data || []).filter(c => c.user_id === user?.id);
  const sharedCategories = (categoriesQuery.data || []).filter(c => c.user_id !== user?.id);

  const createCategory = useMutation({
    mutationFn: async (data: { name: string; description?: string; color: string; members?: CategoryMemberInput[] }) => {
      const hasMembers = (data.members || []).length > 0;
      const { data: result, error } = await supabase
        .from('action_categories')
        .insert({
          name: data.name,
          description: data.description || null,
          color: data.color,
          visibility: hasMembers ? 'team' : 'personal',
          user_id: user!.id,
          team_id: user?.teamId || null,
        })
        .select()
        .single();
      if (error) throw error;

      // Insert members
      if (data.members && data.members.length > 0) {
        const { error: membersError } = await supabase
          .from('action_category_members')
          .insert(data.members.map(m => ({
            category_id: result.id,
            user_id: m.userId,
            role: m.role,
          })));
        if (membersError) throw membersError;
      }

      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Categoria criada com sucesso!');
    },
    onError: () => toast.error('Erro ao criar categoria'),
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, members, ...data }: { id: string; name: string; description?: string; color: string; members?: CategoryMemberInput[] }) => {
      const hasMembers = (members || []).length > 0;
      const { error } = await supabase
        .from('action_categories')
        .update({
          name: data.name,
          description: data.description || null,
          color: data.color,
          visibility: hasMembers ? 'team' : 'personal',
        })
        .eq('id', id);
      if (error) throw error;

      // Sync members: delete all then re-insert
      const { error: deleteError } = await supabase
        .from('action_category_members')
        .delete()
        .eq('category_id', id);
      if (deleteError) throw deleteError;

      if (members && members.length > 0) {
        const { error: insertError } = await supabase
          .from('action_category_members')
          .insert(members.map(m => ({
            category_id: id,
            user_id: m.userId,
            role: m.role,
          })));
        if (insertError) throw insertError;
      }

      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      queryClient.invalidateQueries({ queryKey: ['category-members'] });
      queryClient.invalidateQueries({ queryKey: ['category', id] });
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
      queryClient.invalidateQueries({ queryKey: ['category-actions'] });
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
      queryClient.invalidateQueries({ queryKey: ['category-actions'] });
      toast.success('Ação removida da categoria!');
    },
    onError: () => toast.error('Erro ao remover da categoria'),
  });

  return {
    categories: categoriesQuery.data || [],
    myCategories,
    sharedCategories,
    isLoading: categoriesQuery.isLoading,
    createCategory,
    updateCategory,
    deleteCategory,
    addActionToCategory,
    removeActionFromCategory,
  };
}

/** Get members of a category with profile info */
export function useCategoryMembers(categoryId: string | undefined) {
  return useQuery({
    queryKey: ['category-members', categoryId],
    queryFn: async (): Promise<CategoryMemberWithProfile[]> => {
      const { data, error } = await supabase
        .from('action_category_members')
        .select('id, user_id, role')
        .eq('category_id', categoryId!);
      if (error) throw error;
      if (!data || data.length === 0) return [];

      const userIds = data.map((m: any) => m.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('teammate_profiles')
        .select('id, name, email, avatar_url')
        .in('id', userIds);
      if (profilesError) throw profilesError;

      const profileMap = new Map((profiles || []).map(p => [p.id, p]));

      return data.map((m: any) => {
        const profile = profileMap.get(m.user_id);
        return {
          id: m.id,
          user_id: m.user_id,
          role: m.role,
          name: profile?.name || 'Usuário',
          email: profile?.email || '',
          avatar_url: profile?.avatar_url || null,
        };
      });
    },
    enabled: !!categoryId,
  });
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
