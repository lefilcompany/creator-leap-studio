import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useWorkspace } from '@/contexts/WorkspaceContext';
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
  const { currentWorkspace, loading: wsLoading } = useWorkspace();

  return useQuery({
    queryKey: ['history-brands', currentWorkspace?.id ?? null, user?.id],
    queryFn: async () => {
      let query = supabase
        .from('brands')
        .select('id, name, responsible, brand_color, avatar_url, created_at, updated_at')
        .order('name');
      if (currentWorkspace?.id) {
        query = query.eq('workspace_id', currentWorkspace.id);
      } else {
        // No workspace context — return empty to avoid leaking other workspaces
        return [] as BrandSummary[];
      }
      const { data, error } = await query;
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
    enabled: !!user?.id && !wsLoading,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 30,
  });
}

export function useHistoryActions(filters: HistoryFilters) {
  const { user } = useAuth();
  const { currentWorkspace, loading: wsLoading } = useWorkspace();

  return useInfiniteQuery<HistoryPage>({
    queryKey: ['history-actions', currentWorkspace?.id ?? null, user?.id, filters.brandFilter, filters.typeFilter],
    queryFn: async ({ pageParam }) => {
      const cursor = pageParam as { createdAt: string; id: string } | undefined;

      // Strict workspace isolation: never return cross-workspace data
      if (!currentWorkspace?.id) {
        return { actions: [], nextCursor: null, totalCount: 0 };
      }

      let typeDbValue: string | null = null;
      if (filters.typeFilter !== 'all') {
        const entry = Object.entries(ACTION_TYPE_DISPLAY).find(
          ([_, display]) => display === filters.typeFilter
        );
        if (entry) typeDbValue = entry[0];
      }

      let q = supabase
        .from('actions')
        .select('id, type, created_at, approved, brand_id, thumb_path, result, details, brands:brand_id(name)')
        .is('deleted_at', null)
        .is('parent_action_id', null)
        .eq('workspace_id', currentWorkspace.id)
        .order('created_at', { ascending: false })
        .order('id', { ascending: false })
        .limit(ITEMS_PER_PAGE);

      if (filters.brandFilter !== 'all') q = q.eq('brand_id', filters.brandFilter);
      if (typeDbValue) q = q.eq('type', typeDbValue);
      if (cursor?.createdAt) q = q.lt('created_at', cursor.createdAt);

      const { data: rawRows, error } = await q;
      if (error) throw error;

      const rows = (rawRows || []).map((row: any) => {
        const result = (row.result || {}) as Record<string, any>;
        const details = (row.details || {}) as Record<string, any>;
        const brand = Array.isArray(row.brands) ? row.brands[0] : row.brands;
        return {
          id: row.id,
          type: row.type,
          created_at: row.created_at,
          approved: row.approved,
          brand_id: row.brand_id,
          brand_name: brand?.name || null,
          image_url: result.imageUrl || result.originalImage || null,
          objective: details.objective || null,
          platform: details.platform || null,
          thumb_path: row.thumb_path || null,
          title: result.title || result.description || null,
          video_url: result.videoUrl || null,
        };
      });

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
          type: row.type as ActionSummary['type'],
          createdAt: row.created_at,
          approved: !!row.approved,
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

      return { actions, nextCursor, totalCount: 0 };
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!user?.id && !wsLoading,
    staleTime: 1000 * 60 * 2,
    gcTime: 1000 * 60 * 15,
  });
}
