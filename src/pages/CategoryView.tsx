import { useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { FolderOpen, Settings, UsersRound, Lock, X, Search, UserPlus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ActionList from '@/components/historico/ActionList';
import { CategoryMembersPanel } from '@/components/categorias/CategoryMembersPanel';
import { CategorySettingsPanel } from '@/components/categorias/CategorySettingsPanel';
import { useCategories, useCategoryMembers } from '@/hooks/useCategories';
import { useAuth } from '@/hooks/useAuth';
import { useTeamMembers } from '@/hooks/useTeamData';
import type { ActionSummary } from '@/types/action';
import { ACTION_TYPE_DISPLAY } from '@/types/action';
import { useHistoryBrands } from '@/hooks/useHistoryActions';
import { useFavorites } from '@/hooks/useFavorites';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

function getDisplayName(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length > 2 ? `${parts[0]} ${parts[1]}` : name;
}

export default function CategoryView() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedAction, setSelectedAction] = useState<ActionSummary | null>(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [addPanelOpen, setAddPanelOpen] = useState(false);
  const [memberSearch, setMemberSearch] = useState('');
  const { allFavoriteIds, isFavorite, isPersonalFavorite, isTeamFavorite, toggleFavorite, hasTeam } = useFavorites();
  const { data: brands = [] } = useHistoryBrands();
  const { updateCategory } = useCategories();
  const { data: categoryMembers = [] } = useCategoryMembers(categoryId);
  const { data: teamMembers = [] } = useTeamMembers(user?.teamId);

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

  const addMember = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase
        .from('action_category_members')
        .insert({ category_id: categoryId!, user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['category-members', categoryId] });
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      toast.success('Membro adicionado!');
    },
    onError: () => toast.error('Erro ao adicionar membro'),
  });

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

  // Available members for the side panel
  const availableToAdd = teamMembers.filter(
    tm => tm.id !== category?.user_id && !categoryMembers.some(m => m.user_id === tm.id)
  );

  const filteredAvailable = availableToAdd.filter(tm =>
    !memberSearch || tm.name.toLowerCase().includes(memberSearch.toLowerCase()) || tm.email.toLowerCase().includes(memberSearch.toLowerCase())
  );

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
              variant="outline"
              size="sm"
              className="gap-2 rounded-md h-10 bg-card shadow-sm border border-muted/50 hover:shadow-md hover:bg-accent/20 hover:text-accent hover:border-accent/30 transition-all"
              onClick={() => setManageOpen(true)}
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline text-sm font-medium">Gerenciar</span>
            </Button>
          }
        />
      </main>

      {/* Manage Modal — dual panel like CategoryDialog */}
      {category && (
        <Dialog open={manageOpen} onOpenChange={(open) => { setManageOpen(open); if (!open) { setAddPanelOpen(false); setMemberSearch(''); } }}>
          <DialogContent
            className={cn(
              "p-0 gap-0 overflow-visible bg-transparent border-none shadow-none transition-all duration-300 ease-in-out [&>button.group]:hidden",
              addPanelOpen ? "sm:max-w-[56rem]" : "sm:max-w-lg"
            )}
          >
            <div className="flex items-stretch gap-3">
              {/* Main Panel */}
              <div className={cn(
                "flex flex-col bg-background rounded-2xl shadow-lg border border-border overflow-hidden transition-all duration-300 ease-in-out max-h-[85vh]",
                addPanelOpen ? "w-full sm:w-[28rem] flex-shrink-0" : "w-full"
              )}>
                <DialogHeader className="px-6 pt-6 pb-2 flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${category.color || 'hsl(var(--primary))'}15` }}>
                      <FolderOpen className="h-4.5 w-4.5" style={{ color: category.color || 'hsl(var(--primary))' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <DialogTitle className="text-lg">Gerenciar Categoria</DialogTitle>
                      <p className="text-xs text-muted-foreground mt-0.5">{category.name}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setManageOpen(false)}
                      className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-muted -mr-1.5"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </DialogHeader>

                <Tabs defaultValue="access" className="flex flex-col flex-1 min-h-0">
                  <div className="px-6 flex-shrink-0">
                    <TabsList className="w-full h-10 bg-muted/50 rounded-xl p-1">
                      <TabsTrigger value="access" className="gap-1.5 flex-1 rounded-lg text-xs font-semibold data-[state=active]:shadow-sm">
                        <UsersRound className="h-3.5 w-3.5" />
                        Acesso
                      </TabsTrigger>
                      {isOwner && (
                        <TabsTrigger
                          value="settings"
                          className="gap-1.5 flex-1 rounded-lg text-xs font-semibold data-[state=active]:shadow-sm"
                          onClick={() => { setAddPanelOpen(false); setMemberSearch(''); }}
                        >
                          <Settings className="h-3.5 w-3.5" />
                          Configurações
                        </TabsTrigger>
                      )}
                    </TabsList>
                  </div>

                  <div className="flex-1 overflow-y-auto px-6 py-4">
                    <TabsContent value="access" className="mt-0">
                      <CategoryMembersPanel
                        categoryId={category.id}
                        ownerId={category.user_id}
                        visibility={category.visibility}
                        isOwner={isOwner}
                        onOpenAddPanel={() => setAddPanelOpen(!addPanelOpen)}
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
              </div>

              {/* Side Panel — team members to add */}
              {addPanelOpen && (
                <div className="hidden sm:flex flex-col w-80 flex-shrink-0 bg-background rounded-2xl shadow-lg border border-border max-h-[85vh] animate-in fade-in-0 slide-in-from-right-4 duration-200">
                  <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border">
                    <h3 className="font-semibold text-base">Membros da equipe</h3>
                    <button
                      type="button"
                      onClick={() => { setAddPanelOpen(false); setMemberSearch(''); }}
                      className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  {availableToAdd.length > 3 && (
                    <div className="px-4 pt-3">
                      <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                          value={memberSearch}
                          onChange={e => setMemberSearch(e.target.value)}
                          placeholder="Buscar por nome ou e-mail..."
                          className="pl-8 h-8 text-xs rounded-lg"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
                    {filteredAvailable.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-8 px-2">
                        {memberSearch ? 'Nenhum membro encontrado.' : 'Todos os membros já foram adicionados.'}
                      </p>
                    ) : (
                      filteredAvailable.map(tm => (
                        <button
                          key={tm.id}
                          type="button"
                          onClick={() => addMember.mutate({ userId: tm.id, role: 'viewer' })}
                          disabled={addMember.isPending}
                          className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/60 transition-colors text-left active:scale-[0.98]"
                        >
                          <Avatar className="h-9 w-9 flex-shrink-0">
                            <AvatarImage src={tm.avatar_url || ''} />
                            <AvatarFallback className="text-xs bg-muted font-semibold">
                              {getInitials(tm.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{getDisplayName(tm.name)}</p>
                            <p className="text-xs text-muted-foreground truncate">{tm.email}</p>
                          </div>
                          <span className="text-muted-foreground text-lg leading-none flex-shrink-0">+</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
