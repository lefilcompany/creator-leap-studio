import { useState, useCallback, useMemo } from 'react';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Drawer, DrawerContent, DrawerTitle } from '@/components/ui/drawer';
import { History as HistoryIcon, HelpCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import ActionList from '@/components/historico/ActionList';
import ActionDetails from '@/components/historico/ActionDetails';
import type { Action, ActionSummary } from '@/types/action';
import { ACTION_TYPE_DISPLAY } from '@/types/action';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { TourSelector } from '@/components/onboarding/TourSelector';
import { historySteps, navbarSteps } from '@/components/onboarding/tourSteps';
import historyBanner from '@/assets/history-banner.jpg';
import { useHistoryBrands, useHistoryActions } from '@/hooks/useHistoryActions';

export default function History() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [selectedActionSummary, setSelectedActionSummary] = useState<ActionSummary | null>(null);
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const [isLoadingActionDetails, setIsLoadingActionDetails] = useState(false);
  const [isActionDetailsOpen, setIsActionDetailsOpen] = useState(false);

  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { data: brands = [], isLoading: isLoadingBrands } = useHistoryBrands();

  const filters = useMemo(() => ({ brandFilter, typeFilter }), [brandFilter, typeFilter]);

  const {
    data: actionsData,
    isLoading: isLoadingActions,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useHistoryActions(filters);

  const actions = useMemo(
    () => actionsData?.pages.flatMap(page => page.actions) || [],
    [actionsData]
  );

  const handleSelectAction = useCallback(async (action: ActionSummary) => {
    setSelectedActionSummary(action);
    setIsLoadingActionDetails(true);
    setIsActionDetailsOpen(true);
    
    try {
      const { data, error } = await supabase
        .from('actions')
        .select(`
          id, type, brand_id, team_id, user_id, created_at, updated_at,
          status, approved, revisions, details, result, asset_path,
          brands(id, name),
          profiles!actions_user_id_fkey(id, name, email)
        `)
        .eq('id', action.id)
        .single();

      if (error) throw error;

      setSelectedAction({
        id: data.id, type: data.type as any, brandId: data.brand_id,
        teamId: data.team_id, userId: data.user_id, createdAt: data.created_at,
        updatedAt: data.updated_at, status: data.status, approved: data.approved,
        revisions: data.revisions, details: data.details as any, result: data.result as any,
        brand: data.brands ? { id: data.brands.id, name: data.brands.name } : undefined,
        user: data.profiles ? { id: data.profiles.id, name: data.profiles.name, email: data.profiles.email } : undefined
      });
    } catch (error) {
      console.error('Error loading action details:', error);
      toast.error("Não foi possível carregar os detalhes. Tente novamente.");
    } finally {
      setIsLoadingActionDetails(false);
    }
  }, []);

  const brandOptions = useMemo(() => [
    { value: 'all', label: 'Todas as Marcas' },
    ...brands.map(brand => ({ value: brand.id, label: brand.name }))
  ], [brands]);

  const typeOptions = useMemo(() => [
    { value: 'all', label: 'Todas as Ações' },
    ...Object.values(ACTION_TYPE_DISPLAY).map(displayType => ({ value: displayType, label: displayType }))
  ], []);

  return (
    <div className="flex flex-col -m-4 sm:-m-6 lg:-m-8">
      {/* Banner */}
      <div className="relative w-full h-56 md:h-72 flex-shrink-0 overflow-hidden">
        <img src={historyBanner} alt="" className="w-full h-full object-cover" style={{ objectPosition: 'center 30%' }} loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
      </div>

      {/* Header card */}
      <div className="relative px-4 sm:px-6 lg:px-8 -mt-12 flex-shrink-0">
        <div className="bg-card rounded-2xl shadow-lg p-4 lg:p-5">
          <div className="flex items-center gap-4">
            <div className="bg-secondary/10 border border-secondary/20 shadow-sm rounded-2xl p-3 lg:p-4">
              <HistoryIcon className="h-8 w-8 lg:h-10 lg:w-10 text-secondary" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground flex items-center gap-2">
                Histórico de Ações
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="text-muted-foreground hover:text-foreground transition-colors">
                      <HelpCircle className="h-5 w-5" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-80 text-sm" side="bottom" align="start">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-foreground">O que é o Histórico?</h4>
                      <p className="text-muted-foreground">O histórico reúne todas as ações realizadas pela sua equipe.</p>
                      <h4 className="font-semibold text-foreground mt-3">Como usar?</h4>
                      <ul className="text-muted-foreground space-y-1 list-disc list-inside">
                        <li>Use os filtros para encontrar ações específicas</li>
                        <li>Busque por nome da marca ou tipo de ação</li>
                        <li>Clique em uma ação para ver os detalhes completos</li>
                      </ul>
                    </div>
                  </PopoverContent>
                </Popover>
              </h1>
              <p className="text-sm lg:text-base text-muted-foreground">Visualize e filtre todas as ações realizadas no sistema.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Action list */}
      <main id="history-list" className="px-4 sm:px-6 lg:px-8 pt-4 pb-4 sm:pb-6 lg:pb-8">
        <ActionList
          actions={actions}
          selectedAction={selectedActionSummary}
          onSelectAction={handleSelectAction}
          isLoading={isLoadingActions}
          brands={brands}
          brandFilter={brandFilter}
          onBrandFilterChange={setBrandFilter}
          typeFilter={typeFilter}
          onTypeFilterChange={setTypeFilter}
          brandOptions={brandOptions}
          typeOptions={typeOptions}
          hasNextPage={!!hasNextPage}
          isFetchingNextPage={isFetchingNextPage}
          onLoadMore={() => fetchNextPage()}
        />
      </main>

      {!isMobile && (
        <Sheet open={isActionDetailsOpen} onOpenChange={setIsActionDetailsOpen}>
          <SheetContent side="right" className="w-[60vw] max-w-none">
            <SheetTitle className="text-left mb-4">Detalhes da Ação</SheetTitle>
            <ActionDetails action={selectedAction} isLoading={isLoadingActionDetails} />
          </SheetContent>
        </Sheet>
      )}

      {isMobile && (
        <Drawer open={isActionDetailsOpen} onOpenChange={setIsActionDetailsOpen}>
          <DrawerContent className="h-[85vh]">
            <DrawerTitle className="text-left p-6 pb-0">Detalhes da Ação</DrawerTitle>
            <ActionDetails action={selectedAction} isLoading={isLoadingActionDetails} />
          </DrawerContent>
        </Drawer>
      )}

      <TourSelector 
        tours={[
          { tourType: 'navbar', steps: navbarSteps, label: 'Tour da Navegação', targetElement: '#sidebar-logo' },
          { tourType: 'history', steps: historySteps, label: 'Tour de Histórico', targetElement: '#history-list' }
        ]}
        startDelay={500}
      />
    </div>
  );
}
