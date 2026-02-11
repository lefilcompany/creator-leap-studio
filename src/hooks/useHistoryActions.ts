import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import type { ActionSummary } from '@/types/action';
import { ACTION_TYPE_DISPLAY } from '@/types/action';
import type { BrandSummary } from '@/types/brand';

const ITEMS_PER_PAGE = 24;

interface HistoryFilters {
  brandFilter: string;
  typeFilter: string;
}

interface HistoryPage {
  actions: ActionSummary[];
  nextCursor: { createdAt: string; id: string } | null;
  totalCount: number;
}

export function useHistoryBrands() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['history-brands', user?.teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brands')
        .select('id, name, responsible, created_at, updated_at')
        .eq('team_id', user!.teamId!)
        .order('name');
      if (error) throw error;
      return (data || []).map(brand => ({
        id: brand.id,
        name: brand.name,
        responsible: brand.responsible,
        brandColor: null,
        avatarUrl: null,
        createdAt: brand.created_at,
        updatedAt: brand.updated_at
      })) as BrandSummary[];
    },
    enabled: !!user?.teamId,
  });
}

export function useHistoryActions(filters: HistoryFilters) {
  const { user } = useAuth();

  return useInfiniteQuery<HistoryPage>({
    queryKey: ['history-actions', user?.teamId, filters.brandFilter, filters.typeFilter],
    queryFn: async ({ pageParam }) => {
      const cursor = pageParam as { createdAt: string; id: string } | undefined;
      
      // Resolve type filter to DB value
      let typeDbValue: string | null = null;
      if (filters.typeFilter !== 'all') {
        const entry = Object.entries(ACTION_TYPE_DISPLAY).find(
          ([_, display]) => display === filters.typeFilter
        );
        if (entry) typeDbValue = entry[0];
      }

      const { data, error } = await supabase.rpc('get_action_summaries', {
        p_team_id: user!.teamId!,
        p_brand_filter: filters.brandFilter !== 'all' ? filters.brandFilter : null,
        p_type_filter: typeDbValue,
        p_limit: ITEMS_PER_PAGE,
        p_cursor_created_at: cursor?.createdAt || null,
        p_cursor_id: cursor?.id || null,
      });

      if (error) throw error;

      const rows = data || [];
      const totalCount = rows[0]?.total_count || 0;

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID || '';
      const storageBase = projectId
        ? `https://${projectId}.supabase.co/storage/v1/object/public/creations/`
        : '';

      const actions: ActionSummary[] = rows.map((row: any) => {
        // Build thumbnail URL: prefer thumb_path, then image_url from function
        let imageUrl: string | undefined;
        if (row.thumb_path && storageBase) {
          imageUrl = `${storageBase}${row.thumb_path}`;
        } else if (row.image_url) {
          imageUrl = row.image_url;
        }

        return {
          id: row.id,
          type: row.type,
          createdAt: row.created_at,
          approved: row.approved,
          brand: row.brand_name ? { id: row.brand_id, name: row.brand_name } : null,
          imageUrl,
          title: row.title || undefined,
          platform: row.platform || undefined,
          objective: row.objective || undefined,
        };
      });

      const lastAction = actions[actions.length - 1];
      const nextCursor = actions.length === ITEMS_PER_PAGE && lastAction
        ? { createdAt: lastAction.createdAt, id: lastAction.id }
        : null;

      return { actions, nextCursor, totalCount };
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!user?.teamId,
  });
}
