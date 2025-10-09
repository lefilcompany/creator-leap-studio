import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Loader2, Palette } from 'lucide-react';
import type { StrategicThemeSummary } from "@/types/theme";
import type { BrandSummary } from "@/types/brand";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

interface ThemeListProps {
  themes: StrategicThemeSummary[];
  brands: BrandSummary[];
  selectedTheme: StrategicThemeSummary | null;
  onSelectTheme: (theme: StrategicThemeSummary) => void;
  isLoading?: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR');
};

// Componente de loading profissional
const LoadingState = () => (
  <div className="flex flex-col items-center justify-center py-16 space-y-4">
    <div className="relative">
      <div className="w-16 h-16 border-4 border-primary/20 rounded-full"></div>
      <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-primary rounded-full animate-spin"></div>
    </div>
    <div className="text-center space-y-2">
      <h3 className="text-lg font-semibold text-foreground">Carregando temas</h3>
      <p className="text-sm text-muted-foreground">Aguarde um momento...</p>
    </div>
  </div>
);

export default function ThemeList({ themes, brands, selectedTheme, onSelectTheme, isLoading = false, currentPage, totalPages, onPageChange }: ThemeListProps) {
  const sortedThemes = useMemo(() => {
    return [...themes].sort((a, b) => a.title.localeCompare(b.title));
  }, [themes]);

  const brandMap = useMemo(() => new Map(brands.map(b => [b.id, b.name])), [brands]);

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
    <div className="lg:col-span-2 bg-card p-3 sm:p-4 md:p-6 rounded-xl lg:rounded-2xl border border-primary/10 lg:border-2 flex flex-col max-h-[calc(100vh-12rem)] lg:max-h-[calc(100vh-16rem)] overflow-hidden">
      <h2 className="text-lg sm:text-xl lg:text-2xl font-semibold text-foreground mb-3 lg:mb-4 px-1 lg:px-2 flex-shrink-0">Todos os temas</h2>
      <div className="overflow-y-auto pr-1 lg:pr-2 flex-1 min-h-0">
        {isLoading ? (
          <LoadingState />
        ) : sortedThemes.length > 0 ? (
          <ul className="space-y-2 lg:space-y-3 animate-fade-in">
            {sortedThemes.map((theme) => (
              <li key={theme.id}>
                <button
                  onClick={() => onSelectTheme(theme)}
                  className={cn(
                    "w-full text-left p-3 lg:p-4 rounded-lg border-2 transition-all duration-200 flex items-center justify-between hover:shadow-sm hover-scale",
                    selectedTheme?.id === theme.id
                      ? "bg-primary/10 border-primary shadow-md"
                      : "bg-muted/50 border-transparent hover:border-primary/50 hover:bg-primary/5"
                  )}
                >
                  <div className="flex items-center min-w-0 flex-1">
                    <div className="bg-gradient-to-br from-primary to-secondary text-white rounded-lg w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center font-bold text-lg sm:text-xl mr-3 lg:mr-4 flex-shrink-0">
                      {theme.title.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-sm sm:text-base lg:text-lg text-foreground line-clamp-2 mb-1">{theme.title}</p>
                      <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">Marca: {brandMap.get(theme.brandId) || 'Não definida'}</p>
                    </div>
                  </div>
                  <span className="text-xs sm:text-sm text-muted-foreground hidden sm:block ml-2 flex-shrink-0">
                    Criado em: {formatDate(theme.createdAt)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center text-muted-foreground py-6 lg:py-8 animate-fade-in">
            <Palette className="h-10 w-10 sm:h-12 sm:w-12 mx-auto mb-3 opacity-50" />
            <p className="text-sm sm:text-base">Nenhum tema encontrado</p>
            <p className="text-xs sm:text-sm mt-1 opacity-75">Clique em "Novo tema" para começar.</p>
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