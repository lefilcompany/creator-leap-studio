import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ActionSummary } from '@/types/action';
import { ACTION_TYPE_DISPLAY, ACTION_STYLE_MAP } from '@/types/action';
import { cn } from '@/lib/utils';

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
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export default function ActionList({ 
  actions, 
  selectedAction, 
  onSelectAction, 
  isLoading,
  currentPage,
  totalPages,
  onPageChange
}: ActionListProps) {
  if (isLoading) {
    return (
      <div className="lg:col-span-2 space-y-4">
        <Card className="shadow-sm border-secondary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-8 w-24" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-secondary/10">
                  <Skeleton className="w-12 h-12 rounded-lg" />
                  <div className="flex-1">
                    <Skeleton className="h-5 w-48 mb-2" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="lg:col-span-2 space-y-4">
      <Card className="shadow-sm border-secondary/20">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Ações Recentes</h2>
            <Badge variant="secondary" className="bg-secondary/10 text-secondary">
              {actions.length} ações
            </Badge>
          </div>
          
          {actions.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-muted-foreground">
                <p className="text-lg font-medium mb-2">Nenhuma ação encontrada</p>
                <p>Não há ações que correspondam aos filtros selecionados.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {actions.map((action) => {
                const displayType = ACTION_TYPE_DISPLAY[action.type];
                const style = ACTION_STYLE_MAP[displayType];
                const Icon = style?.icon;
                const isSelected = selectedAction?.id === action.id;

                return (
                  <div
                    key={action.id}
                    onClick={() => onSelectAction(action)}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/20",
                      isSelected 
                        ? "border-primary/30 bg-primary/5 shadow-sm" 
                        : "border-secondary/10 hover:border-secondary/20"
                    )}
                  >
                    {Icon && (
                      <div className={cn("flex-shrink-0 rounded-lg w-12 h-12 flex items-center justify-center", style.background)}>
                        <Icon className={cn("h-6 w-6", style.color)} />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-foreground truncate">
                        {displayType}
                      </h3>
                      <p className="text-sm text-muted-foreground truncate">
                        Marca: {action.brand?.name || 'N/A'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(action.createdAt)}
                      </p>
                    </div>
                    <Badge 
                      variant={action.approved ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {action.approved ? 'Aprovada' : 'Pendente'}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t border-secondary/10">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              
              {[...Array(totalPages)].map((_, i) => {
                const page = i + 1;
                const isCurrentPage = page === currentPage;
                
                // Mostrar apenas algumas páginas ao redor da atual
                if (totalPages > 7) {
                  if (page === 1 || page === totalPages || 
                      (page >= currentPage - 1 && page <= currentPage + 1)) {
                    return (
                      <Button
                        key={page}
                        variant={isCurrentPage ? "default" : "outline"}
                        size="sm"
                        onClick={() => onPageChange(page)}
                        className="h-8 w-8 p-0"
                      >
                        {page}
                      </Button>
                    );
                  } else if (page === currentPage - 2 || page === currentPage + 2) {
                    return <span key={page} className="px-2">...</span>;
                  }
                  return null;
                }
                
                return (
                  <Button
                    key={page}
                    variant={isCurrentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => onPageChange(page)}
                    className="h-8 w-8 p-0"
                  >
                    {page}
                  </Button>
                );
              })}
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}