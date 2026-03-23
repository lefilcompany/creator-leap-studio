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
    queryKey: ['history-brands', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('brands')
        .select('id, name, responsible, brand_color, avatar_url, created_at, updated_at')
        .order('name');
      if (error) throw error;
      return (data || []).map(brand => ({
        id: brand.id,
        name: brand.name,
        responsible: brand.responsible,
        brandColor: brand.brand_color ?? null,
        avatarUrl: brand.avatar_url ?? null,
        createdAt: brand.created_at,
        updatedAt: brand.updated_at
      })) as BrandSummary[];
    },
    enabled: !!user?.id,
  });
}

export function useHistoryActions(filters: HistoryFilters) {
  const { user } = useAuth();

  return useInfiniteQuery<HistoryPage>({
    queryKey: ['history-actions', user?.id, filters.brandFilter, filters.typeFilter],
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
        p_user_id: user!.id,
        p_team_id: user?.teamId || null,
        p_brand_filter: filters.brandFilter !== 'all' ? filters.brandFilter : null,
        p_type_filter: typeDbValue,
        p_limit: ITEMS_PER_PAGE,
        p_cursor_created_at: cursor?.createdAt || null,
        p_cursor_id: cursor?.id || null,
      });

      if (error) throw error;

      const rows = data || [];
      const totalCount = rows[0]?.total_count || 0;

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
      const storageBase = supabaseUrl
        ? `${supabaseUrl}/storage/v1/object/public/content-images/`
        : '';

      const toStorageObjectPath = (value?: string | null) => {
        if (!value) return null;

        if (value.startsWith('http')) {
          const marker = '/storage/v1/object/public/content-images/';
          const markerIndex = value.indexOf(marker);
          if (markerIndex >= 0) {
            const objectPathWithQuery = value.slice(markerIndex + marker.length);
            return objectPathWithQuery.split('?')[0] || null;
          }
        }

        return value.replace(/^\/+/, '');
      };

      const actions: ActionSummary[] = rows.map((row: any) => {
        let imageUrl: string | undefined;

        if (row.thumb_path && storageBase) {
          const objectPath = toStorageObjectPath(row.thumb_path);
          imageUrl = objectPath ? `${storageBase}${objectPath}` : undefined;
        } else if (row.image_url) {
          if (row.image_url.startsWith('http') || row.image_url.startsWith('data:')) {
            imageUrl = row.image_url;
          } else if (storageBase) {
            const objectPath = toStorageObjectPath(row.image_url);
            imageUrl = objectPath ? `${storageBase}${objectPath}` : undefined;
          }
        }

        return {
          id: row.id,
          type: row.type,
          createdAt: row.created_at,
          approved: row.approved,
          brand: row.brand_name ? { id: row.brand_id, name: row.brand_name } : null,
          imageUrl,
          videoUrl: row.video_url || undefined,
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
    enabled: !!user?.id,
  });
}
