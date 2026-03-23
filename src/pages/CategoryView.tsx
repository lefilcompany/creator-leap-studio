import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FolderOpen, Users, User, Settings, UsersRound, ChevronDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import ActionList from '@/components/historico/ActionList';
import { CategoryMembersPanel } from '@/components/categorias/CategoryMembersPanel';
import { CategorySettingsPanel } from '@/components/categorias/CategorySettingsPanel';
import { useCategories } from '@/hooks/useCategories';
import { useAuth } from '@/hooks/useAuth';
import type { ActionSummary } from '@/types/action';
import { ACTION_TYPE_DISPLAY } from '@/types/action';
import { useHistoryBrands } from '@/hooks/useHistoryActions';
import { useFavorites } from '@/hooks/useFavorites';
import { cn } from '@/lib/utils';

export default function CategoryView() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedAction, setSelectedAction] = useState<ActionSummary | null>(null);
  const { allFavoriteIds, isFavorite, isPersonalFavorite, isTeamFavorite, toggleFavorite, hasTeam } = useFavorites();
  const { data: brands = [] } = useHistoryBrands();
  const { updateCategory } = useCategories();

  const { data: category, isLoading: loadingCategory } = useQuery({
    queryKey: ['category', categoryId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('action_categories')
        .select('*')
        .eq('id', categoryId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!categoryId,
  });

  const isOwner = category?.user_id === user?.id;

  const { data: categoryActions = [], isLoading: loadingActions } = useQuery({
    queryKey: ['category-actions', categoryId],
    queryFn: async () => {
      const { data: items, error: itemsError } = await supabase
        .from('action_category_items')
        .select('action_id')
        .eq('category_id', categoryId!);
      if (itemsError) throw itemsError;
      if (!items || items.length === 0) return [];

      const actionIds = items.map((i: any) => i.action_id);
      const { data: actions, error } = await supabase
        .from('actions')
        .select('id, type, created_at, approved, brand_id, details, result, thumb_path, brands(name)')
        .in('id', actionIds)
        .order('created_at', { ascending: false });
      if (error) throw error;

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
      const storageBase = supabaseUrl ? `${supabaseUrl}/storage/v1/object/public/content-images/` : '';

      return (actions || []).map((a: any) => ({
        id: a.id,
        type: a.type,
        createdAt: a.created_at,
        approved: a.approved,
        brand: a.brands ? { id: a.brand_id, name: a.brands.name } : null,
        imageUrl: a.thumb_path ? `${storageBase}${a.thumb_path}` : a.result?.imageUrl || undefined,
        videoUrl: a.result?.videoUrl || undefined,
        title: a.result?.title || a.result?.description || undefined,
        platform: a.details?.platform || undefined,
        objective: a.details?.objective || undefined,
      })) as ActionSummary[];
    },
    enabled: !!categoryId,
  });

  const brandOptions = useMemo(() => [
    { value: 'all', label: 'Todas as Marcas' },
    ...brands.map(b => ({ value: b.id, label: b.name })),
  ], [brands]);

  const typeOptions = useMemo(() => [
    { value: 'all', label: 'Todas as Ações' },
    ...Object.values(ACTION_TYPE_DISPLAY).map(d => ({ value: d, label: d })),
  ], []);

  const handleSettingsSave = (data: { name: string; description?: string; color: string }) => {
    if (!categoryId) return;
    updateCategory.mutate({ id: categoryId, ...data });
  };

  if (loadingCategory) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="flex flex-col -m-4 sm:-m-6 lg:-m-8">
      {/* Banner */}
      <div className="relative w-full h-28 md:h-36 flex-shrink-0 overflow-hidden" style={{ backgroundColor: category?.color || 'hsl(var(--primary))' }}>
        <PageBreadcrumb variant="overlay" items={[{ label: 'Categorias', href: '/categories' }, { label: category?.name || '' }]} />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
      </div>

      {/* Header */}
      <div className="relative px-4 sm:px-6 lg:px-8 -mt-10 flex-shrink-0">
        <div className="bg-card rounded-2xl shadow-lg p-3 lg:p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${category?.color}20` }}>
              <FolderOpen className="h-5 w-5" style={{ color: category?.color }} />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-xl lg:text-2xl font-bold text-foreground truncate">{category?.name}</h1>
              {category?.description && <p className="text-sm text-muted-foreground truncate">{category.description}</p>}
            </div>
            <Badge variant="outline" className={cn("gap-1 text-xs flex-shrink-0", category?.visibility === 'team' ? "border-secondary/40 text-secondary" : "")}>
              {category?.visibility === 'team' ? <Users className="h-3 w-3" /> : <User className="h-3 w-3" />}
              {category?.visibility === 'team' ? 'Equipe' : 'Pessoal'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Content area with sidebar */}
      <div className="px-4 sm:px-6 lg:px-8 pt-4 pb-4 sm:pb-6 lg:pb-8">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Main content */}
          <main className="flex-1 min-w-0">
            <ActionList
              actions={categoryActions}
              selectedAction={selectedAction}
              onSelectAction={setSelectedAction}
              isLoading={loadingActions}
              brands={brands}
              brandFilter="all"
              onBrandFilterChange={() => {}}
              typeFilter="all"
              onTypeFilterChange={() => {}}
              brandOptions={brandOptions}
              typeOptions={typeOptions}
              hasNextPage={false}
              isFetchingNextPage={false}
              onLoadMore={() => {}}
              isFavorite={isFavorite}
              isPersonalFavorite={isPersonalFavorite}
              isTeamFavorite={isTeamFavorite}
              onToggleFavorite={toggleFavorite}
              hasTeam={hasTeam}
            />
          </main>

          {/* Right sidebar — Members & Settings */}
          <aside className="w-full lg:w-80 flex-shrink-0 space-y-3">
            {/* Members section */}
            <Collapsible defaultOpen>
              <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-2">
                    <UsersRound className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">Acesso</span>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4">
                    {category && (
                      <CategoryMembersPanel
                        categoryId={category.id}
                        ownerId={category.user_id}
                        visibility={category.visibility}
                        isOwner={isOwner}
                      />
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>

            {/* Settings section — only for owner */}
            {isOwner && category && (
              <Collapsible>
                <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
                  <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-semibold">Configurações</span>
                    </div>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 [[data-state=open]>&]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-4 pb-4">
                      <CategorySettingsPanel
                        name={category.name}
                        description={category.description}
                        color={category.color || '#6366f1'}
                        onSave={handleSettingsSave}
                        isSaving={updateCategory.isPending}
                      />
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
