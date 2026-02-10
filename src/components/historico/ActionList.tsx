import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Eye, Search, ArrowUpDown, ArrowUp, ArrowDown, List, LayoutGrid, X, Clock, Sparkles, CheckCircle, Calendar, Video, Image } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NativeSelect } from '@/components/ui/native-select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink,
  PaginationNext, PaginationPrevious, PaginationEllipsis,
} from "@/components/ui/pagination";
import type { ActionSummary } from '@/types/action';
import { ACTION_TYPE_DISPLAY, ACTION_STYLE_MAP } from '@/types/action';
import type { BrandSummary } from '@/types/brand';

interface ActionListProps {
  actions: ActionSummary[];
  selectedAction: ActionSummary | null;
  onSelectAction: (action: ActionSummary) => void;
  isLoading: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  brands: BrandSummary[];
  brandFilter: string;
  onBrandFilterChange: (value: string) => void;
  typeFilter: string;
  onTypeFilterChange: (value: string) => void;
  brandOptions: { value: string; label: string }[];
  typeOptions: { value: string; label: string }[];
}

type SortField = 'type' | 'date';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'grid' | 'list';

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }) +
    ', ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const formatDateShort = (dateString: string) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('pt-BR');
};

const generatePagination = (currentPage: number, totalPages: number) => {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  if (currentPage <= 3) return [1, 2, 3, 4, '...', totalPages];
  if (currentPage >= totalPages - 2) return [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
};

const ACTION_ICON_MAP: Record<string, React.ElementType> = {
  'CRIAR_CONTEUDO': Image,
  'CRIAR_CONTEUDO_RAPIDO': Sparkles,
  'REVISAR_CONTEUDO': CheckCircle,
  'PLANEJAR_CONTEUDO': Calendar,
  'GERAR_VIDEO': Video,
};

const ACTION_GRADIENT_MAP: Record<string, string> = {
  'CRIAR_CONTEUDO': 'from-primary/30 to-primary/10',
  'CRIAR_CONTEUDO_RAPIDO': 'from-primary/30 to-primary/10',
  'REVISAR_CONTEUDO': 'from-accent/30 to-accent/10',
  'PLANEJAR_CONTEUDO': 'from-secondary/30 to-secondary/10',
  'GERAR_VIDEO': 'from-primary/30 to-primary/10',
};

const ACTION_COLOR_MAP: Record<string, string> = {
  'CRIAR_CONTEUDO': 'text-primary',
  'CRIAR_CONTEUDO_RAPIDO': 'text-primary',
  'REVISAR_CONTEUDO': 'text-accent',
  'PLANEJAR_CONTEUDO': 'text-secondary',
  'GERAR_VIDEO': 'text-primary',
};

// Loading skeletons
const LoadingGrid = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
    {Array.from({ length: 8 }).map((_, i) => (
      <div key={i} className="animate-pulse bg-card rounded-2xl overflow-hidden shadow-sm border border-border/30">
        <div className="aspect-video bg-muted" />
        <div className="p-4 space-y-3">
          <div className="h-4 w-3/4 bg-muted rounded" />
          <div className="flex gap-2">
            <div className="h-5 w-20 bg-muted rounded-full" />
            <div className="h-5 w-16 bg-muted rounded-full" />
          </div>
          <div className="h-3 w-1/2 bg-muted rounded" />
        </div>
      </div>
    ))}
  </div>
);

const LoadingRows = () => (
  <>
    {Array.from({ length: 5 }).map((_, i) => (
      <TableRow key={i} className="animate-pulse border-none">
        <TableCell><div className="w-12 h-8 rounded bg-muted" /></TableCell>
        <TableCell><div className="h-4 w-32 bg-muted rounded" /></TableCell>
        <TableCell><div className="h-4 w-24 bg-muted rounded" /></TableCell>
        <TableCell><div className="h-4 w-20 bg-muted rounded" /></TableCell>
        <TableCell><div className="h-4 w-24 bg-muted rounded" /></TableCell>
      </TableRow>
    ))}
  </>
);

// Grid card
function ActionCard({ action, isSelected, onSelect, onView }: {
  action: ActionSummary; isSelected: boolean; onSelect: () => void; onView: (e: React.MouseEvent) => void;
}) {
  const displayType = ACTION_TYPE_DISPLAY[action.type];
  const style = ACTION_STYLE_MAP[displayType];
  const FallbackIcon = ACTION_ICON_MAP[action.type] || Sparkles;
  const gradient = ACTION_GRADIENT_MAP[action.type] || 'from-muted to-muted/50';
  const iconColor = ACTION_COLOR_MAP[action.type] || 'text-primary';

  return (
    <div
      onClick={onSelect}
      className={cn(
        "cursor-pointer bg-card rounded-2xl overflow-hidden transition-all duration-300 group border border-border/30 flex flex-col",
        isSelected
          ? "ring-2 ring-primary/40 shadow-lg scale-[1.02]"
          : "hover:shadow-lg hover:scale-[1.01] hover:border-border/60 shadow-sm"
      )}
    >
      {/* Image area */}
      <div className="aspect-video w-full relative overflow-hidden bg-muted">
        {action.imageUrl ? (
          <img
            src={action.imageUrl}
            alt={action.title || displayType}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className={cn("w-full h-full flex items-center justify-center bg-gradient-to-br", gradient)}>
            <FallbackIcon className={cn("h-12 w-12 opacity-40", iconColor)} />
          </div>
        )}
        {/* Type badge overlay */}
        <div className="absolute top-2 left-2">
          <Badge className={cn("text-xs font-medium shadow-sm", style.background, style.color, "border-0")}>
            {displayType}
          </Badge>
        </div>
        {/* View button overlay */}
        <button
          onClick={onView}
          className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-lg p-1.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background shadow-sm"
        >
          <Eye className="h-4 w-4 text-foreground" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col gap-2">
        <p className="font-medium text-sm text-foreground line-clamp-2 leading-snug">
          {action.title || displayType}
        </p>

        <div className="flex items-center gap-2 flex-wrap">
          {action.platform && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 font-normal">
              {action.platform}
            </Badge>
          )}
          {action.objective && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 font-normal truncate max-w-[120px]">
              {action.objective}
            </Badge>
          )}
        </div>

        <div className="mt-auto pt-2 border-t border-border/20 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {formatDate(action.createdAt)}
          </span>
          {action.brand && (
            <span className="text-xs text-muted-foreground truncate max-w-[100px]" title={action.brand.name}>
              {action.brand.name}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ActionList({
  actions, selectedAction, onSelectAction, isLoading = false,
  currentPage, totalPages, onPageChange,
  brands, brandFilter, onBrandFilterChange, typeFilter, onTypeFilterChange,
  brandOptions, typeOptions,
}: ActionListProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  const filteredAndSortedActions = useMemo(() => {
    let result = [...actions];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(a => {
        const displayType = ACTION_TYPE_DISPLAY[a.type]?.toLowerCase() || '';
        const brandName = a.brand?.name?.toLowerCase() || '';
        const title = a.title?.toLowerCase() || '';
        return displayType.includes(query) || brandName.includes(query) || title.includes(query);
      });
    }

    result.sort((a, b) => {
      if (sortField === 'date') {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return sortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      }
      const cmp = (ACTION_TYPE_DISPLAY[a.type] || '').localeCompare(ACTION_TYPE_DISPLAY[b.type] || '');
      return sortDirection === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [actions, searchQuery, sortField, sortDirection]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'date' ? 'desc' : 'asc');
    }
  };

  const handleViewAction = (actionId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    navigate(`/action/${actionId}`);
  };

  const handlePageClick = (page: number | string, event?: React.MouseEvent) => {
    if (event) event.preventDefault();
    if (typeof page === 'number' && page > 0 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
    }
  };

  const hasActiveFilters = searchQuery.trim() || brandFilter !== 'all' || typeFilter !== 'all' || sortField !== 'date' || sortDirection !== 'desc';

  const clearFilters = () => {
    setSearchQuery('');
    onBrandFilterChange('all');
    onTypeFilterChange('all');
    setSortField('date');
    setSortDirection('desc');
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />;
    return sortDirection === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />;
  };

  const paginationRange = generatePagination(currentPage, totalPages);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por tipo, marca ou título..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9 h-10 bg-card shadow-sm border border-muted/50 focus:border-primary/40 focus:bg-background"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filters */}
        <NativeSelect
          value={brandFilter}
          onValueChange={onBrandFilterChange}
          options={brandOptions}
          placeholder="Marca"
          triggerClassName="w-full sm:w-[160px] h-10 rounded-lg shadow-sm border-muted/50"
        />
        <NativeSelect
          value={typeFilter}
          onValueChange={onTypeFilterChange}
          options={typeOptions}
          placeholder="Ação"
          triggerClassName="w-full sm:w-[160px] h-10 rounded-lg shadow-sm border-muted/50"
        />

        {/* Sort + Clear + View Toggle */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => toggleSort('date')}
            className={cn(
              "h-10 px-3 gap-1.5 shadow-sm border border-muted/50",
              sortField === 'date' && "bg-primary/10 border-primary/30 text-primary"
            )}
          >
            Data <SortIcon field="date" />
          </Button>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-10 px-3 text-muted-foreground shadow-sm border border-muted/50 hover:border-accent hover:bg-accent/20 hover:text-accent"
            >
              <X className="h-4 w-4 mr-1" /> Limpar
            </Button>
          )}

          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(v) => { if (v) setViewMode(v as ViewMode); }}
            className="bg-muted/50 shadow-sm rounded-lg p-0.5 gap-0 border border-muted/50 ml-auto"
          >
            <ToggleGroupItem
              value="grid"
              aria-label="Visualização em blocos"
              className="rounded-l-md rounded-r-none border-0 px-3 py-1.5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-sm data-[state=off]:bg-transparent data-[state=off]:hover:bg-muted"
            >
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="list"
              aria-label="Visualização em lista"
              className="rounded-r-md rounded-l-none border-0 px-3 py-1.5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-sm data-[state=off]:bg-transparent data-[state=off]:hover:bg-muted"
            >
              <List className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        viewMode === 'list' ? (
          <div className="bg-card rounded-xl shadow-sm overflow-hidden">
            <Table><TableBody><LoadingRows /></TableBody></Table>
          </div>
        ) : (
          <LoadingGrid />
        )
      ) : filteredAndSortedActions.length === 0 ? (
        <div className="text-center text-muted-foreground py-16 animate-fade-in">
          {searchQuery.trim() || brandFilter !== 'all' || typeFilter !== 'all' ? (
            <>
              <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-base">Nenhuma ação encontrada para os filtros selecionados.</p>
              <p className="text-sm mt-1 opacity-75">Tente ajustar os filtros ou buscar outro termo.</p>
            </>
          ) : (
            <>
              <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-base">Nenhuma ação encontrada.</p>
              <p className="text-sm mt-1 opacity-75">Crie conteúdo para ver seu histórico aqui.</p>
            </>
          )}
        </div>
      ) : viewMode === 'list' ? (
        /* List view */
        <div className="bg-card rounded-xl shadow-sm overflow-hidden border border-muted/50">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-border/20">
                <TableHead className="w-16 text-xs uppercase tracking-wider text-muted-foreground font-semibold">Img</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Tipo / Título</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold hidden md:table-cell">Marca</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold hidden lg:table-cell">Plataforma</TableHead>
                <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold text-right">Data</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAndSortedActions.map((action) => {
                const displayType = ACTION_TYPE_DISPLAY[action.type];
                const style = ACTION_STYLE_MAP[displayType];
                const Icon = ACTION_ICON_MAP[action.type] || Sparkles;
                const gradient = ACTION_GRADIENT_MAP[action.type];
                const iconColor = ACTION_COLOR_MAP[action.type];

                return (
                  <TableRow
                    key={action.id}
                    onClick={() => onSelectAction(action)}
                    className={cn(
                      "cursor-pointer transition-colors duration-150 border-b border-border/10",
                      selectedAction?.id === action.id ? "bg-primary/8 hover:bg-primary/12" : "hover:bg-muted/50"
                    )}
                  >
                    <TableCell className="py-2">
                      <div className="w-14 h-10 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                        {action.imageUrl ? (
                          <img src={action.imageUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className={cn("w-full h-full flex items-center justify-center bg-gradient-to-br", gradient)}>
                            <Icon className={cn("h-4 w-4 opacity-50", iconColor)} />
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <Badge className={cn("text-[10px] w-fit mb-0.5 border-0", style.background, style.color)}>
                          {displayType}
                        </Badge>
                        <span className="font-medium text-sm text-foreground line-clamp-1">
                          {action.title || displayType}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden md:table-cell">
                      {action.brand?.name || '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden lg:table-cell">
                      {action.platform || '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm text-right">
                      {formatDateShort(action.createdAt)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        /* Grid view */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredAndSortedActions.map((action) => (
            <ActionCard
              key={action.id}
              action={action}
              isSelected={selectedAction?.id === action.id}
              onSelect={() => onSelectAction(action)}
              onView={(e) => handleViewAction(action.id, e)}
            />
          ))}
        </div>
      )}

      {/* Pagination - only in list view */}
      {totalPages > 1 && !isLoading && viewMode === 'list' && (
        <div className="pt-2">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={(e) => handlePageClick(currentPage - 1, e)}
                  disabled={currentPage === 1}
                  className={cn("cursor-pointer", currentPage === 1 && "pointer-events-none opacity-50")}
                  aria-disabled={currentPage === 1}
                />
              </PaginationItem>
              {paginationRange.map((page, index) => {
                if (typeof page === 'string') return <PaginationEllipsis key={`ellipsis-${index}`} />;
                return (
                  <PaginationItem key={page}>
                    <PaginationLink onClick={(e) => handlePageClick(page, e)} isActive={currentPage === page} className="cursor-pointer">
                      {page}
                    </PaginationLink>
                  </PaginationItem>
                );
              })}
              <PaginationItem>
                <PaginationNext
                  onClick={(e) => handlePageClick(currentPage + 1, e)}
                  disabled={currentPage === totalPages}
                  className={cn("cursor-pointer", currentPage === totalPages && "pointer-events-none opacity-50")}
                  aria-disabled={currentPage === totalPages}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );
}
