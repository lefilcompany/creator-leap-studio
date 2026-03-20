import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, X, Image, Sparkles, CheckCircle, Calendar, Video, ArrowDown, ArrowUp, Filter, FolderOpen } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { ACTION_TYPE_DISPLAY } from '@/types/action';
import type { BrandSummary } from '@/types/brand';
import type { CategoryWithCount } from '@/types/category';

type SortField = 'date' | 'type';
type SortDirection = 'asc' | 'desc';

interface HistoryFilterSidebarProps {
  brandFilter: string;
  onBrandFilterChange: (value: string) => void;
  typeFilter: string;
  onTypeFilterChange: (value: string) => void;
  brands: BrandSummary[];
  sortField: SortField;
  sortDirection: SortDirection;
  onSortChange: (field: SortField, direction: SortDirection) => void;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  categories: CategoryWithCount[];
}

const ACTION_TYPES = [
  { key: 'CRIAR_CONTEUDO', icon: Image, color: 'text-primary', bg: 'bg-primary/10' },
  { key: 'CRIAR_CONTEUDO_RAPIDO', icon: Sparkles, color: 'text-primary', bg: 'bg-primary/10' },
  { key: 'REVISAR_CONTEUDO', icon: CheckCircle, color: 'text-accent', bg: 'bg-accent/10' },
  { key: 'PLANEJAR_CONTEUDO', icon: Calendar, color: 'text-secondary', bg: 'bg-secondary/10' },
  { key: 'GERAR_VIDEO', icon: Video, color: 'text-primary', bg: 'bg-primary/10' },
] as const;

function FilterSection({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center justify-between w-full px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors">
        {title}
        <ChevronDown className={cn("h-3.5 w-3.5 transition-transform duration-200", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-1.5 pb-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

function SidebarContent({
  brandFilter, onBrandFilterChange, typeFilter, onTypeFilterChange,
  brands, sortField, sortDirection, onSortChange,
  categoryFilter, onCategoryFilterChange, categories,
}: HistoryFilterSidebarProps) {
  const hasActiveFilters = brandFilter !== 'all' || typeFilter !== 'all' || sortField !== 'date' || sortDirection !== 'desc' || categoryFilter !== 'all';

  const clearFilters = () => {
    onBrandFilterChange('all');
    onTypeFilterChange('all');
    onCategoryFilterChange('all');
    onSortChange('date', 'desc');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 space-y-1 overflow-y-auto">
        {/* Action Type */}
        <FilterSection title="Tipo de Ação">
          <div className="space-y-0.5">
            <button
              onClick={() => onTypeFilterChange('all')}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors active:scale-[0.97]",
                typeFilter === 'all'
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              Todas as ações
            </button>
            {ACTION_TYPES.map(({ key, icon: Icon, color, bg }) => {
              const display = ACTION_TYPE_DISPLAY[key as keyof typeof ACTION_TYPE_DISPLAY];
              const isActive = typeFilter === display;
              return (
                <button
                  key={key}
                  onClick={() => onTypeFilterChange(isActive ? 'all' : display)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors active:scale-[0.97]",
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <div className={cn("w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0", isActive ? "bg-primary/15" : bg)}>
                    <Icon className={cn("h-3.5 w-3.5", isActive ? "text-primary" : color)} />
                  </div>
                  <span className="truncate">{display}</span>
                </button>
              );
            })}
          </div>
        </FilterSection>

        <div className="mx-3 border-t border-border/20" />

        {/* Brand */}
        <FilterSection title="Marca">
          <div className="space-y-0.5 max-h-48 overflow-y-auto">
            <button
              onClick={() => onBrandFilterChange('all')}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors active:scale-[0.97]",
                brandFilter === 'all'
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              Todas as marcas
            </button>
            {brands.map((brand) => {
              const isActive = brandFilter === brand.id;
              return (
                <button
                  key={brand.id}
                  onClick={() => onBrandFilterChange(isActive ? 'all' : brand.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors active:scale-[0.97]",
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-border/30"
                    style={{ backgroundColor: brand.brandColor || 'hsl(var(--muted))' }}
                  />
                  <span className="truncate">{brand.name}</span>
                </button>
              );
            })}
            {brands.length === 0 && (
              <p className="text-xs text-muted-foreground/60 px-3 py-2 italic">Nenhuma marca encontrada</p>
            )}
          </div>
        </FilterSection>

        <div className="mx-3 border-t border-border/20" />

        {/* Category */}
        <FilterSection title="Categoria">
          <div className="space-y-0.5 max-h-48 overflow-y-auto">
            <button
              onClick={() => onCategoryFilterChange('all')}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors active:scale-[0.97]",
                categoryFilter === 'all'
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              Todas as categorias
            </button>
            <button
              onClick={() => onCategoryFilterChange('none')}
              className={cn(
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors active:scale-[0.97]",
                categoryFilter === 'none'
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <span className="italic">Sem categoria</span>
            </button>
            {categories.map((cat) => {
              const isActive = categoryFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => onCategoryFilterChange(isActive ? 'all' : cat.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors active:scale-[0.97]",
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <div
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-border/30"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="truncate">{cat.name}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto tabular-nums">{cat.action_count}</span>
                </button>
              );
            })}
          </div>
        </FilterSection>

        {/* Sort */}
        <FilterSection title="Ordenar por">
          <div className="space-y-0.5">
            {([
              { field: 'date' as SortField, label: 'Data', descLabel: 'Mais recente', ascLabel: 'Mais antigo' },
              { field: 'type' as SortField, label: 'Tipo', descLabel: 'Z → A', ascLabel: 'A → Z' },
            ]).map(({ field, descLabel, ascLabel }) => {
              const isActive = sortField === field;
              return (
                <button
                  key={field}
                  onClick={() => {
                    if (isActive) {
                      onSortChange(field, sortDirection === 'asc' ? 'desc' : 'asc');
                    } else {
                      onSortChange(field, field === 'date' ? 'desc' : 'asc');
                    }
                  }}
                  className={cn(
                    "w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-colors active:scale-[0.97]",
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <span>{isActive ? (sortDirection === 'desc' ? descLabel : ascLabel) : descLabel}</span>
                  {isActive && (
                    sortDirection === 'desc'
                      ? <ArrowDown className="h-3.5 w-3.5" />
                      : <ArrowUp className="h-3.5 w-3.5" />
                  )}
                </button>
              );
            })}
          </div>
        </FilterSection>
      </div>

      {/* Clear filters */}
      {hasActiveFilters && (
        <div className="p-3 border-t border-border/20">
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="w-full h-9 text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1.5"
          >
            <X className="h-3.5 w-3.5" />
            Limpar filtros
          </Button>
        </div>
      )}
    </div>
  );
}

export function HistoryFilterSidebar(props: HistoryFilterSidebarProps) {
  const isMobile = useIsMobile();
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeCount = [
    props.brandFilter !== 'all',
    props.typeFilter !== 'all',
    props.categoryFilter !== 'all',
    props.sortField !== 'date' || props.sortDirection !== 'desc',
  ].filter(Boolean).length;

  // On mobile, render nothing here — use MobileFilterButton inline in toolbar
  if (isMobile) {
    return null;
  }

  return (
    <aside className="w-[220px] flex-shrink-0 bg-card rounded-xl shadow-sm border border-border/20 overflow-hidden self-start sticky top-4">
      <div className="px-3 py-3 border-b border-border/20">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          Filtros
          {activeCount > 0 && (
            <span className="bg-primary/15 text-primary text-[10px] font-semibold rounded-full px-1.5 py-0.5 tabular-nums">
              {activeCount}
            </span>
          )}
        </h3>
      </div>
      <SidebarContent {...props} />
    </aside>
  );
}

/** Mobile filter button + sheet — rendered inline in ActionList toolbar */
export function MobileFilterTrigger(props: HistoryFilterSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeCount = [
    props.brandFilter !== 'all',
    props.typeFilter !== 'all',
    props.categoryFilter !== 'all',
    props.sortField !== 'date' || props.sortDirection !== 'desc',
  ].filter(Boolean).length;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setMobileOpen(true)}
        className="h-10 gap-2 shadow-sm border-muted/50 flex-shrink-0"
      >
        <Filter className="h-4 w-4" />
        <span className="hidden sm:inline">Filtros</span>
        {activeCount > 0 && (
          <span className="bg-primary/15 text-primary text-[10px] font-semibold rounded-full px-1.5 py-0.5 tabular-nums">
            {activeCount}
          </span>
        )}
      </Button>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[280px] p-0 pt-12">
          <SheetHeader className="px-4 pb-3 border-b border-border/20">
            <SheetTitle className="text-base">Filtros</SheetTitle>
          </SheetHeader>
          <div className="pt-2">
            <SidebarContent {...props} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
