import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface TrashItem {
  id: string;
  type: string;
  created_at: string;
  deleted_at: string;
  brand_name: string | null;
  image_url: string | null;
  thumb_path: string | null;
  title: string | null;
  platform: string | null;
  video_url: string | null;
}

export function useTrashItems() {
  const { team, user } = useAuth();

  return useQuery({
    queryKey: ['trash-items', team?.id, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from('actions')
        .select('id, type, created_at, deleted_at, brand_id, thumb_path, result, details, brands(name)')
        .not('deleted_at', 'is', null)
        .order('deleted_at', { ascending: false });

      if (team?.id) {
        query = query.eq('team_id', team.id);
      } else {
        query = query.eq('user_id', user.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
      const storageBase = supabaseUrl ? `${supabaseUrl}/storage/v1/object/public/content-images/` : '';

      return (data || []).map((row: any) => {
        let imageUrl: string | null = null;
        if (row.thumb_path && storageBase) {
          imageUrl = `${storageBase}${row.thumb_path.replace(/^\/+/, '')}`;
        } else if (row.result?.imageUrl) {
          imageUrl = row.result.imageUrl;
        }

        return {
          id: row.id,
          type: row.type,
          created_at: row.created_at,
          deleted_at: row.deleted_at,
          brand_name: row.brands?.name || null,
          image_url: imageUrl,
          thumb_path: row.thumb_path,
          title: row.result?.title || row.result?.description || null,
          platform: row.details?.platform || null,
          video_url: row.result?.videoUrl || null,
        } as TrashItem;
      });
    },
    enabled: !!user?.id,
  });
}

export function useSoftDelete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (actionId: string) => {
      const { error } = await supabase
        .from('actions')
        .update({ deleted_at: new Date().toISOString() } as any)
        .eq('id', actionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actions'] });
      queryClient.invalidateQueries({ queryKey: ['history-actions'] });
      queryClient.invalidateQueries({ queryKey: ['trash-items'] });
      toast({ title: 'Movido para a lixeira', description: 'O item será excluído permanentemente em 30 dias.' });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível mover para a lixeira.', variant: 'destructive' });
    },
  });
}

export function useRestoreAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (actionId: string) => {
      const { error } = await supabase
        .from('actions')
        .update({ deleted_at: null } as any)
        .eq('id', actionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['actions'] });
      queryClient.invalidateQueries({ queryKey: ['history-actions'] });
      queryClient.invalidateQueries({ queryKey: ['trash-items'] });
      toast({ title: 'Restaurado', description: 'O item foi restaurado com sucesso.' });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível restaurar o item.', variant: 'destructive' });
    },
  });
}

export function usePermanentDelete() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (actionId: string) => {
      const { error } = await supabase
        .from('actions')
        .delete()
        .eq('id', actionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash-items'] });
      toast({ title: 'Excluído permanentemente', description: 'O item foi removido definitivamente.' });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível excluir o item.', variant: 'destructive' });
    },
  });
}

export function useEmptyTrash() {
  const { team, user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      let query = supabase
        .from('actions')
        .delete()
        .not('deleted_at', 'is', null);

      if (team?.id) {
        query = query.eq('team_id', team.id);
      } else if (user?.id) {
        query = query.eq('user_id', user.id);
      }

      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trash-items'] });
      toast({ title: 'Lixeira esvaziada', description: 'Todos os itens foram removidos permanentemente.' });
    },
    onError: () => {
      toast({ title: 'Erro', description: 'Não foi possível esvaziar a lixeira.', variant: 'destructive' });
    },
  });
}
