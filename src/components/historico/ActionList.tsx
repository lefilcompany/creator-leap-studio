import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Eye, Clock } from 'lucide-react';
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

// Componente de loading profissional
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

  const handleViewAction = (actionId: string, event: React.MouseEvent) => {
    event.stopPropagation();
    navigate(`/action/${actionId}`);
  };

  const handlePageClick = (page: number | string, event?: React.MouseEvent) => {
    if (event) {
      event.preventDefault();
    }
    if (typeof page === 'number' && page > 0 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
    }
  };

  const paginationRange = generatePagination(currentPage, totalPages);

  return (
    <div className="bg-card p-4 md:p-6 rounded-2xl border-2 border-primary/10 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h2 className="text-2xl font-semibold text-foreground">Ações Recentes</h2>
        {!isLoading && (
          <Badge variant="secondary" className="bg-secondary/10 text-secondary">
            {actions.length} ações
          </Badge>
        )}
      </div>
      
      <div className="overflow-y-auto pr-2 flex-1 min-h-0">
        {isLoading ? (
          <LoadingState />
        ) : actions.length > 0 ? (
          <ul className="space-y-3 animate-fade-in">
            {actions.map((action) => {
              const displayType = ACTION_TYPE_DISPLAY[action.type];
              const style = ACTION_STYLE_MAP[displayType];
              const Icon = style.icon;
              return (
                <li key={action.id}>
                  <div
                    onClick={() => onSelectAction(action)}
                    className={cn(
                      "w-full text-left p-4 rounded-lg border-2 transition-all duration-200 flex items-center justify-between gap-4 hover-scale cursor-pointer",
                      selectedAction?.id === action.id
                        ? "bg-primary/10 border-primary shadow-md"
                        : "bg-muted/50 border-transparent hover:border-border/60 hover:bg-muted"
                    )}
                  >
                    <div className="flex items-center overflow-hidden flex-1">
                      <div className={cn("flex-shrink-0 rounded-lg w-10 h-10 flex items-center justify-center mr-4", style.background)}>
                        <Icon className={cn("h-5 w-5", style.color)} />
                      </div>
                      <div className="overflow-hidden flex-1">
                        <p className="font-semibold text-lg text-foreground truncate">{ACTION_TYPE_DISPLAY[action.type]}</p>
                        <p className="text-sm text-muted-foreground truncate">Marca: {action.brand?.name || 'Não especificada'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        onClick={(e) => handleViewAction(action.id, e)}
                        variant="outline"
                        size="sm"
                        className="h-8 px-2 hover:bg-accent/20 hover:text-accent hover:border-accent"
                      >
                        <Eye className="h-4 w-4" />
                        <span className="ml-1 hidden sm:inline">Visualizar</span>
                      </Button>
                      <span className="text-sm text-muted-foreground hidden md:block">
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
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-base">Nenhuma ação encontrada para o(s) filtro(s) selecionado(s).</p>
            <p className="text-sm mt-1 opacity-75">Tente ajustar os filtros ou criar novas ações.</p>
          </div>
        )}
      </div>

      {totalPages > 1 && !isLoading && (
        <div className="pt-4 mt-auto flex-shrink-0 border-t border-border/20">
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