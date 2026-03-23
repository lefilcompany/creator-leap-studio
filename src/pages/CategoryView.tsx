import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FolderOpen, Settings, UsersRound, Lock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ActionList from '@/components/historico/ActionList';
import { CategoryMembersPanel } from '@/components/categorias/CategoryMembersPanel';
import { CategorySettingsPanel } from '@/components/categorias/CategorySettingsPanel';
import { useCategories, useCategoryMembers } from '@/hooks/useCategories';
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
  const [manageOpen, setManageOpen] = useState(false);
  const { allFavoriteIds, isFavorite, isPersonalFavorite, isTeamFavorite, toggleFavorite, hasTeam } = useFavorites();
  const { data: brands = [] } = useHistoryBrands();
  const { updateCategory } = useCategories();
  const { data: categoryMembers = [] } = useCategoryMembers(categoryId);

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
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setManageOpen(true)}
                  className="cursor-pointer"
                >
                  <Badge variant="secondary" className="gap-1.5 text-xs flex-shrink-0 border-0 bg-muted/60 text-muted-foreground hover:bg-accent/20 hover:text-accent transition-colors">
                    {categoryMembers.length > 0 ? (
                      <>
                        <UsersRound className="h-3 w-3" />
                        {categoryMembers.length + 1} {categoryMembers.length + 1 === 1 ? 'pessoa' : 'pessoas'}
                      </>
                    ) : (
                      <>
                        <Lock className="h-3 w-3" />
                        Só você
                      </>
                    )}
                  </Badge>
                </button>
              </TooltipTrigger>
              <TooltipContent>Gerenciar acesso</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>

      {/* Actions */}
      <main className="px-4 sm:px-6 lg:px-8 pt-4 pb-4 sm:pb-6 lg:pb-8">
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
          toolbarEndSlot={
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 rounded-xl hover:bg-accent/20 hover:text-accent transition-all h-10"
              onClick={() => setManageOpen(true)}
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline text-sm font-medium">Gerenciar</span>
            </Button>
          }
        />
      </main>

      {/* Manage Modal */}
      {category && (
        <Dialog open={manageOpen} onOpenChange={setManageOpen}>
          <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col p-0 gap-0">
            <DialogHeader className="px-6 pt-6 pb-0">
              <DialogTitle>Gerenciar Categoria</DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="access" className="flex flex-col flex-1 min-h-0">
              <TabsList className="mx-6 mt-4 w-auto self-start">
                <TabsTrigger value="access" className="gap-1.5">
                  <UsersRound className="h-3.5 w-3.5" />
                  Acesso
                </TabsTrigger>
                {isOwner && (
                  <TabsTrigger value="settings" className="gap-1.5">
                    <Settings className="h-3.5 w-3.5" />
                    Configurações
                  </TabsTrigger>
                )}
              </TabsList>

              <div className="flex-1 overflow-y-auto px-6 py-4">
                <TabsContent value="access" className="mt-0">
                  <CategoryMembersPanel
                    categoryId={category.id}
                    ownerId={category.user_id}
                    visibility={category.visibility}
                    isOwner={isOwner}
                  />
                </TabsContent>

                {isOwner && (
                  <TabsContent value="settings" className="mt-0">
                    <CategorySettingsPanel
                      name={category.name}
                      description={category.description}
                      color={category.color || '#6366f1'}
                      onSave={handleSettingsSave}
                      isSaving={updateCategory.isPending}
                    />
                  </TabsContent>
                )}
              </div>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
