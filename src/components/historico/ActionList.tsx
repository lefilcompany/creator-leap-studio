import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Eye, Clock, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { ActionSummary } from '@/types/action';
import { ACTION_TYPE_DISPLAY, ACTION_STYLE_MAP } from '@/types/action';
import { cn } from '@/lib/utils';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

interface ActionListProps {
  actions: ActionSummary[];
  selectedAction: ActionSummary | null;
  onSelectAction: (action: ActionSummary) => void;
  isLoading: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric'
  });
};

const generatePagination = (currentPage: number, totalPages: number) => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  if (currentPage <= 3) {
    return [1, 2, 3, 4, '...', totalPages];
  }
  if (currentPage >= totalPages - 2) {
    return [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }
  return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
};

type SortDirection = 'asc' | 'desc' | null;

// Loading skeleton
const LoadingState = () => (
  <div className="flex flex-col items-center justify-center py-16 space-y-4">
    <div className="relative">
      <div className="w-16 h-16 border-4 border-secondary/20 rounded-full"></div>
      <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-secondary rounded-full animate-spin"></div>
    </div>
    <div className="text-center space-y-2">
      <h3 className="text-lg font-semibold text-foreground">Carregando histórico</h3>
      <p className="text-sm text-muted-foreground">Aguarde um momento...</p>
    </div>
  </div>
);

export default function ActionList({
  actions,
  selectedAction,
  onSelectAction,
  isLoading = false,
  currentPage,
  totalPages,
  onPageChange,
}: ActionListProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [dateSortDirection, setDateSortDirection] = useState<SortDirection>(null);

  const filteredAndSortedActions = useMemo(() => {
    let result = [...actions];

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(a => {
        const displayType = ACTION_TYPE_DISPLAY[a.type]?.toLowerCase() || '';
        const brandName = a.brand?.name?.toLowerCase() || '';
        return displayType.includes(query) || brandName.includes(query);
      });
    }

    // Sort by date
    if (dateSortDirection) {
      result.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateSortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      });
    }

    return result;
  }, [actions, searchQuery, dateSortDirection]);

  const toggleDateSort = () => {
    setDateSortDirection(prev => {
      if (prev === null) return 'desc';
      if (prev === 'desc') return 'asc';
      return null;
    });
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

  const paginationRange = generatePagination(currentPage, totalPages);
  const DateSortIcon = dateSortDirection === 'asc' ? ArrowUp : dateSortDirection === 'desc' ? ArrowDown : ArrowUpDown;

  return (
    <div className="bg-card rounded-2xl border border-border/20 flex flex-col h-full overflow-hidden shadow-sm">
      {/* Search bar + sort */}
      <div className="p-3 border-b border-border/30 flex-shrink-0 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por tipo ou marca..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-muted/30 border-border/30 focus:bg-background"
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleDateSort}
          className={cn(
            "h-9 px-3 gap-1.5 text-xs font-medium shrink-0",
            dateSortDirection && "text-primary"
          )}
        >
          <DateSortIcon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Data</span>
        </Button>
        {!isLoading && (
          <Badge variant="secondary" className="bg-secondary/10 text-secondary shrink-0 hidden sm:flex">
            {actions.length} ações
          </Badge>
        )}
      </div>
      
      {/* Action items */}
      <div className="overflow-y-auto flex-1 min-h-0 p-2">
        {isLoading ? (
          <LoadingState />
        ) : filteredAndSortedActions.length > 0 ? (
          <ul className="space-y-1.5 animate-fade-in">
            {filteredAndSortedActions.map((action) => {
              const displayType = ACTION_TYPE_DISPLAY[action.type];
              const style = ACTION_STYLE_MAP[displayType];
              const Icon = style.icon;
              return (
                <li key={action.id}>
                  <div
                    onClick={() => onSelectAction(action)}
                    className={cn(
                      "w-full text-left px-3 py-2.5 rounded-lg border transition-all duration-150 flex items-center justify-between gap-3 cursor-pointer",
                      selectedAction?.id === action.id
                        ? "bg-primary/8 border-primary/40 shadow-sm"
                        : "bg-transparent border-transparent hover:bg-muted/50 hover:border-border/40"
                    )}
                  >
                    <div className="flex items-center overflow-hidden flex-1 gap-3">
                      <div className={cn("flex-shrink-0 rounded-lg w-9 h-9 flex items-center justify-center", style.background)}>
                        <Icon className={cn("h-4 w-4", style.color)} />
                      </div>
                      <div className="overflow-hidden flex-1">
                        <p className="font-medium text-sm text-foreground truncate">{ACTION_TYPE_DISPLAY[action.type]}</p>
                        <p className="text-xs text-muted-foreground truncate">{action.brand?.name || 'Marca não especificada'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        onClick={(e) => handleViewAction(action.id, e)}
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs hover:bg-accent/20 hover:text-accent"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span className="ml-1 hidden sm:inline">Ver</span>
                      </Button>
                      <span className="text-xs text-muted-foreground hidden md:block w-20 text-right">
                        {formatDate(action.createdAt)}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="text-center text-muted-foreground p-8 animate-fade-in">
            {searchQuery.trim() ? (
              <>
                <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-base">Nenhuma ação encontrada para "{searchQuery}"</p>
                <p className="text-sm mt-1 opacity-75">Tente buscar com outro termo.</p>
              </>
            ) : (
              <>
                <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-base">Nenhuma ação encontrada para o(s) filtro(s) selecionado(s).</p>
                <p className="text-sm mt-1 opacity-75">Tente ajustar os filtros ou criar novas ações.</p>
              </>
            )}
          </div>
        )}
      </div>

      {totalPages > 1 && !isLoading && (
        <div className="pt-3 pb-3 px-4 mt-auto flex-shrink-0 border-t border-border/30">
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
                if (typeof page === 'string') {
                  return <PaginationEllipsis key={`ellipsis-${index}`} />;
                }
                return (
                  <PaginationItem key={page}>
                    <PaginationLink
                      onClick={(e) => handlePageClick(page, e)}
                      isActive={currentPage === page}
                      className="cursor-pointer"
                    >
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
