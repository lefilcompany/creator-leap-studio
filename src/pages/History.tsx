import { useState, useMemo } from 'react';
import { History as HistoryIcon, HelpCircle, Star } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import ActionList from '@/components/historico/ActionList';
import type { ActionSummary } from '@/types/action';
import { ACTION_TYPE_DISPLAY } from '@/types/action';
import { useAuth } from '@/hooks/useAuth';
import { TourSelector } from '@/components/onboarding/TourSelector';
import { historySteps, navbarSteps } from '@/components/onboarding/tourSteps';
import historyBanner from '@/assets/history-banner.jpg';
import { PageBreadcrumb } from '@/components/PageBreadcrumb';
import { useHistoryBrands, useHistoryActions } from '@/hooks/useHistoryActions';
import { useFavorites } from '@/hooks/useFavorites';
import { HistoryFilterSidebar, MobileFilterTrigger } from '@/components/historico/HistoryFilterSidebar';
import { useIsMobile } from '@/hooks/use-mobile';

type SortField = 'date' | 'type';
type SortDirection = 'asc' | 'desc';

export default function History() {
  const { user } = useAuth();
  const [selectedActionSummary, setSelectedActionSummary] = useState<ActionSummary | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'favorites'>('all');
  const { allFavoriteIds, isFavorite, isPersonalFavorite, isTeamFavorite, toggleFavorite, hasTeam } = useFavorites();
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const isMobile = useIsMobile();

  const { data: brands = [], isLoading: isLoadingBrands } = useHistoryBrands();

  const filters = useMemo(() => ({ brandFilter, typeFilter }), [brandFilter, typeFilter]);

  const {
    data: actionsData,
    isLoading: isLoadingActions,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useHistoryActions(filters);

  const allActions = useMemo(
    () => actionsData?.pages.flatMap(page => page.actions) || [],
    [actionsData]
  );

  const actions = useMemo(() => {
    if (activeTab === 'favorites') {
      return allActions.filter(a => allFavoriteIds.includes(a.id));
    }
    if (allFavoriteIds.length === 0) return allActions;
    const favSet = new Set(allFavoriteIds);
    const favs = allActions.filter(a => favSet.has(a.id));
    const rest = allActions.filter(a => !favSet.has(a.id));
    return [...favs, ...rest];
  }, [allActions, activeTab, allFavoriteIds]);

  const brandOptions = useMemo(() => [
    { value: 'all', label: 'Todas as Marcas' },
    ...brands.map(brand => ({ value: brand.id, label: brand.name }))
  ], [brands]);

  const typeOptions = useMemo(() => [
    { value: 'all', label: 'Todas as Ações' },
    ...Object.values(ACTION_TYPE_DISPLAY).map(displayType => ({ value: displayType, label: displayType }))
  ], []);

  const handleSortChange = (field: SortField, direction: SortDirection) => {
    setSortField(field);
    setSortDirection(direction);
  };

  return (
    <div className="flex flex-col -m-4 sm:-m-6 lg:-m-8">
      {/* Banner */}
      <div className="relative w-full h-36 md:h-44 flex-shrink-0 overflow-hidden">
        <PageBreadcrumb
          variant="overlay"
          items={[{ label: 'Histórico' }]}
        />
        <img src={historyBanner} alt="" className="w-full h-full object-cover" style={{ objectPosition: 'center 30%' }} loading="lazy" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-background/20 to-transparent" />
      </div>

      {/* Header card */}
      <div className="relative px-4 sm:px-6 lg:px-8 -mt-10 flex-shrink-0">
        <div className="bg-card rounded-2xl shadow-lg p-4 lg:p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
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

            {/* Tab switcher */}
            <div className="flex items-center gap-0.5 bg-muted/40 rounded-lg p-0.5">
              <button
                onClick={() => setActiveTab('all')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all active:scale-[0.97]",
                  activeTab === 'all'
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <HistoryIcon className="h-3.5 w-3.5" />
                Todas
              </button>
              <button
                onClick={() => setActiveTab('favorites')}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all active:scale-[0.97]",
                  activeTab === 'favorites'
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Star className="h-3.5 w-3.5" />
                Favoritas
                {allFavoriteIds.length > 0 && (
                  <span className={cn(
                    "ml-0.5 text-[10px] rounded-full px-1.5 py-0.5 font-semibold tabular-nums",
                    activeTab === 'favorites'
                      ? "bg-primary/15 text-primary"
                      : "bg-amber-400/20 text-amber-600 dark:text-amber-400"
                  )}>
                    {allFavoriteIds.length}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content area: sidebar + action list */}
      <main id="history-list" className="px-4 sm:px-6 lg:px-8 pt-4 pb-4 sm:pb-6 lg:pb-8">
        <div className="flex gap-4 items-start">
          <HistoryFilterSidebar
            brandFilter={brandFilter}
            onBrandFilterChange={setBrandFilter}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
            brands={brands}
            sortField={sortField}
            sortDirection={sortDirection}
            onSortChange={handleSortChange}
          />

          <div className="flex-1 min-w-0 space-y-4">
            <ActionList
              actions={actions}
              selectedAction={selectedActionSummary}
              onSelectAction={setSelectedActionSummary}
              isLoading={isLoadingActions}
              brands={brands}
              brandFilter={brandFilter}
              onBrandFilterChange={setBrandFilter}
              typeFilter={typeFilter}
              onTypeFilterChange={setTypeFilter}
              brandOptions={brandOptions}
              typeOptions={typeOptions}
              hasNextPage={activeTab === 'all' ? !!hasNextPage : false}
              isFetchingNextPage={isFetchingNextPage}
              onLoadMore={() => fetchNextPage()}
              isFavorite={isFavorite}
              isPersonalFavorite={isPersonalFavorite}
              isTeamFavorite={isTeamFavorite}
              onToggleFavorite={toggleFavorite}
              hasTeam={hasTeam}
              sortField={sortField}
              sortDirection={sortDirection}
              onSortChange={handleSortChange}
              mobileFilterSlot={isMobile ? (
                <MobileFilterTrigger
                  brandFilter={brandFilter}
                  onBrandFilterChange={setBrandFilter}
                  typeFilter={typeFilter}
                  onTypeFilterChange={setTypeFilter}
                  brands={brands}
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSortChange={handleSortChange}
                />
              ) : undefined}
            />
          </div>
        </div>
      </main>

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
