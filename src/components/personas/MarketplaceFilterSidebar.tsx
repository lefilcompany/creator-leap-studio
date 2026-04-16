import { useMemo } from 'react';
import { Search, X, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';

export type AgeRange = 'todos' | '18-29' | '30-44' | '45-59' | '60+';

export type MarketplaceFilters = {
  search: string;
  categories: string[];
  genders: string[];
  ageRanges: AgeRange[];
  states: string[];
  journeyStages: string[];
};

export const initialFilters: MarketplaceFilters = {
  search: '',
  categories: [],
  genders: [],
  ageRanges: [],
  states: [],
  journeyStages: [],
};

type FacetCount = { value: string; count: number };

type Props = {
  filters: MarketplaceFilters;
  onChange: (next: MarketplaceFilters) => void;
  facets: {
    categories: FacetCount[];
    genders: FacetCount[];
    ageRanges: FacetCount[];
    states: FacetCount[];
    journeyStages: FacetCount[];
  };
  totalResults: number;
  totalAll: number;
};

export function MarketplaceFilterSidebar({ filters, onChange, facets, totalResults, totalAll }: Props) {
  const activeCount = useMemo(
    () =>
      filters.categories.length +
      filters.genders.length +
      filters.ageRanges.length +
      filters.states.length +
      filters.journeyStages.length +
      (filters.search ? 1 : 0),
    [filters]
  );

  const toggleArrayValue = <K extends keyof MarketplaceFilters>(
    key: K,
    value: string
  ) => {
    const arr = filters[key] as string[];
    const next = arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
    onChange({ ...filters, [key]: next } as MarketplaceFilters);
  };

  const reset = () => onChange(initialFilters);

  return (
    <aside className="bg-card rounded-2xl shadow-md p-4 lg:p-5 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 rounded-lg p-1.5">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground">Filtros</h2>
            <p className="text-[11px] text-muted-foreground">
              {totalResults} de {totalAll} personas
            </p>
          </div>
        </div>
        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={reset}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Limpar
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Buscar persona..."
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          className="pl-9 pr-9 h-9 bg-background text-sm"
        />
        {filters.search && (
          <button
            type="button"
            onClick={() => onChange({ ...filters, search: '' })}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted text-muted-foreground"
            aria-label="Limpar busca"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Active chips */}
      {activeCount > 0 && (
        <div className="flex flex-wrap gap-1 mb-3 pb-3 border-b border-border/50">
          {[
            ...filters.categories.map((v) => ({ key: 'categories' as const, v })),
            ...filters.genders.map((v) => ({ key: 'genders' as const, v })),
            ...filters.ageRanges.map((v) => ({ key: 'ageRanges' as const, v })),
            ...filters.states.map((v) => ({ key: 'states' as const, v })),
            ...filters.journeyStages.map((v) => ({ key: 'journeyStages' as const, v })),
          ].map(({ key, v }) => (
            <button
              key={`${key}-${v}`}
              type="button"
              onClick={() => toggleArrayValue(key, v)}
              className="text-[11px] inline-flex items-center gap-1 bg-primary/10 text-primary border border-primary/20 rounded-full px-2 py-0.5 hover:bg-primary/20"
            >
              {v}
              <X className="h-2.5 w-2.5" />
            </button>
          ))}
        </div>
      )}

      {/* Filter groups */}
      <ScrollArea className="flex-1 -mr-2 pr-2">
        <Accordion
          type="multiple"
          defaultValue={['categories', 'genders', 'ageRanges']}
          className="space-y-1"
        >
          <FilterGroup
            id="categories"
            label="Categoria"
            options={facets.categories}
            selected={filters.categories}
            onToggle={(v) => toggleArrayValue('categories', v)}
          />
          <FilterGroup
            id="genders"
            label="Gênero"
            options={facets.genders}
            selected={filters.genders}
            onToggle={(v) => toggleArrayValue('genders', v)}
          />
          <FilterGroup
            id="ageRanges"
            label="Faixa etária"
            options={facets.ageRanges}
            selected={filters.ageRanges}
            onToggle={(v) => toggleArrayValue('ageRanges', v)}
          />
          <FilterGroup
            id="states"
            label="Estado"
            options={facets.states}
            selected={filters.states}
            onToggle={(v) => toggleArrayValue('states', v)}
            scrollable
          />
          <FilterGroup
            id="journeyStages"
            label="Estágio de jornada"
            options={facets.journeyStages}
            selected={filters.journeyStages}
            onToggle={(v) => toggleArrayValue('journeyStages', v)}
          />
        </Accordion>
      </ScrollArea>
    </aside>
  );
}

function FilterGroup({
  id,
  label,
  options,
  selected,
  onToggle,
  scrollable = false,
}: {
  id: string;
  label: string;
  options: FacetCount[];
  selected: string[];
  onToggle: (v: string) => void;
  scrollable?: boolean;
}) {
  if (options.length === 0) return null;

  return (
    <AccordionItem value={id} className="border-b-0 border border-border/40 rounded-lg bg-background/50 px-3">
      <AccordionTrigger className="py-2.5 text-xs font-semibold text-foreground hover:no-underline">
        <span className="flex items-center gap-2">
          {label}
          {selected.length > 0 && (
            <span className="text-[10px] bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 font-normal">
              {selected.length}
            </span>
          )}
        </span>
      </AccordionTrigger>
      <AccordionContent className="pb-2">
        <div className={cn('space-y-1', scrollable && 'max-h-44 overflow-y-auto pr-1')}>
          {options.map((opt) => {
            const isChecked = selected.includes(opt.value);
            return (
              <label
                key={opt.value}
                className={cn(
                  'flex items-center justify-between gap-2 py-1 px-1.5 rounded cursor-pointer text-xs hover:bg-muted/60 transition-colors',
                  isChecked && 'bg-primary/5'
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Checkbox
                    checked={isChecked}
                    onCheckedChange={() => onToggle(opt.value)}
                    className="h-3.5 w-3.5"
                  />
                  <span className="truncate text-foreground">{opt.value}</span>
                </div>
                <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                  {opt.count}
                </span>
              </label>
            );
          })}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}
