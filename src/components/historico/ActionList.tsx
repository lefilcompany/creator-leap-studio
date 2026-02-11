import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Eye, Search, ArrowUpDown, ArrowUp, ArrowDown, List, LayoutGrid, X, Clock, Sparkles, CheckCircle, Calendar, Video, Image, Globe, Users, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { NativeSelect } from '@/components/ui/native-select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import type { ActionSummary } from '@/types/action';
import { ACTION_TYPE_DISPLAY, ACTION_STYLE_MAP } from '@/types/action';
import type { BrandSummary } from '@/types/brand';

interface ActionListProps {
  actions: ActionSummary[];
  selectedAction: ActionSummary | null;
  onSelectAction: (action: ActionSummary) => void;
  isLoading: boolean;
  brands: BrandSummary[];
  brandFilter: string;
  onBrandFilterChange: (value: string) => void;
  typeFilter: string;
  onTypeFilterChange: (value: string) => void;
  brandOptions: { value: string; label: string }[];
  typeOptions: { value: string; label: string }[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  onLoadMore: () => void;
}

type SortField = 'type' | 'date';
type SortDirection = 'asc' | 'desc';
type ViewMode = 'grid' | 'list';

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const d = new Date(dateString);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formatDateShort = (dateString: string) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('pt-BR');
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

// Platform icons (inline SVGs for brand icons not available in Lucide)
function PlatformIcon({ platform, className = "h-4 w-4" }: { platform: string; className?: string }) {
  switch (platform) {
    case 'Instagram':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={cn(className, "text-[#E4405F]")}>
          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
        </svg>
      );
    case 'Facebook':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={cn(className, "text-[#1877F2]")}>
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
        </svg>
      );
    case 'LinkedIn':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={cn(className, "text-[#0A66C2]")}>
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
      );
    case 'TikTok':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={cn(className, "text-foreground")}>
          <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
        </svg>
      );
    case 'Twitter/X':
      return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={cn(className, "text-foreground")}>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      );
    case 'Comunidades':
      return <Users className={cn(className, "text-secondary")} />;
    default:
      return <Globe className={cn(className, "text-muted-foreground")} />;
  }
}


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
function ActionCard({ action, isSelected, onNavigate }: {
  action: ActionSummary; isSelected: boolean; onNavigate: () => void;
}) {
  const displayType = ACTION_TYPE_DISPLAY[action.type];
  const style = ACTION_STYLE_MAP[displayType];
  const FallbackIcon = ACTION_ICON_MAP[action.type] || Sparkles;
  const gradient = ACTION_GRADIENT_MAP[action.type] || 'from-muted to-muted/50';
  const iconColor = ACTION_COLOR_MAP[action.type] || 'text-primary';

  return (
    <div
      onClick={onNavigate}
      className={cn(
        "cursor-pointer bg-card rounded-2xl overflow-hidden transition-shadow duration-200 group border border-border/30 flex flex-col shadow-sm",
        isSelected && "ring-2 ring-primary/40 shadow-lg"
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
        {/* View button overlay */}
        <div
          className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-lg p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
        >
          <Eye className="h-4 w-4 text-foreground" />
        </div>
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col gap-2.5">
        <p className="font-medium text-sm text-foreground line-clamp-2 leading-snug">
          {action.title || displayType}
        </p>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Badge className="text-[10px] px-2 py-0.5 h-5 font-medium border-0 bg-primary/20 text-primary hover:bg-primary/20">
            {displayType}
          </Badge>
          {action.platform && (
            <PlatformIcon platform={action.platform} className="h-4 w-4" />
          )}
          {action.objective && (
            <Badge variant="outline" className="text-[10px] px-2 py-0.5 h-5 font-normal truncate max-w-[120px]">
              {action.objective}
            </Badge>
          )}
        </div>

        <div className="mt-auto pt-2 border-t border-border/20 flex flex-col gap-1">
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {formatDate(action.createdAt)}
          </span>
          {action.brand ? (
            <div className="flex items-center gap-1.5">
              <div 
                className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-border/30" 
                style={{ backgroundColor: (action.brand as any).color || 'hsl(var(--muted))' }}
              />
              <span className="text-[11px] text-muted-foreground leading-tight">
                {action.brand.name}
              </span>
            </div>
          ) : (
            <span className="text-[11px] text-muted-foreground/60 italic">Sem marca</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ActionList({
  actions, selectedAction, onSelectAction, isLoading = false,
  brands, brandFilter, onBrandFilterChange, typeFilter, onTypeFilterChange,
  brandOptions, typeOptions,
  hasNextPage, isFetchingNextPage, onLoadMore,
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
    navigate(`/action/${actionId}`, { state: { viewMode } });
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
                const Icon = ACTION_ICON_MAP[action.type] || Sparkles;
                const gradient = ACTION_GRADIENT_MAP[action.type];
                const iconColor = ACTION_COLOR_MAP[action.type];

                return (
                  <TableRow
                    key={action.id}
                    onClick={() => navigate(`/action/${action.id}`, { state: { viewMode } })}
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
                      <Badge className="text-[10px] w-fit border-0 bg-primary/20 text-primary hover:bg-primary/20">
                        {displayType}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden md:table-cell">
                      {action.brand?.name || '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm hidden lg:table-cell">
                      {action.platform ? (
                        <div className="flex items-center gap-1.5">
                          <PlatformIcon platform={action.platform} className="h-4 w-4" />
                          <span>{action.platform}</span>
                        </div>
                      ) : '—'}
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
              onNavigate={() => navigate(`/action/${action.id}`, { state: { viewMode } })}
            />
          ))}
        </div>
      )}

      {/* Load More */}
      {hasNextPage && !isLoading && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={onLoadMore}
            disabled={isFetchingNextPage}
            className="gap-2 px-8"
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando...
              </>
            ) : (
              'Carregar mais'
            )}
          </Button>
        </div>
      )}
    </div>
  );
}
