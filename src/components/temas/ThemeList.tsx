import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Palette, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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

type SortDirection = 'asc' | 'desc' | null;

export default function ThemeList({ themes, brands, selectedTheme, onSelectTheme, isLoading = false, currentPage, totalPages, onPageChange }: ThemeListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateSortDirection, setDateSortDirection] = useState<SortDirection>(null);

  const brandMap = useMemo(() => new Map(brands.map(b => [b.id, b.name])), [brands]);

  const filteredAndSortedThemes = useMemo(() => {
    let result = [...themes];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(t =>
        t.title.toLowerCase().includes(query) ||
        (brandMap.get(t.brandId) || '').toLowerCase().includes(query)
      );
    }

    // Sort
    if (dateSortDirection) {
      result.sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateSortDirection === 'asc' ? dateA - dateB : dateB - dateA;
      });
    } else {
      result.sort((a, b) => a.title.localeCompare(b.title));
    }

    return result;
  }, [themes, searchQuery, dateSortDirection, brandMap]);

  const toggleDateSort = () => {
    setDateSortDirection(prev => {
      if (prev === null) return 'desc';
      if (prev === 'desc') return 'asc';
      return null;
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

  const handlePageClick = (page: number | string, event?: React.MouseEvent) => {
    if (event) event.preventDefault();
    if (typeof page === 'number' && page > 0 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
    }
  };

  const paginationRange = generatePagination(currentPage, totalPages);

  const DateSortIcon = dateSortDirection === 'asc' ? ArrowUp : dateSortDirection === 'desc' ? ArrowDown : ArrowUpDown;

  return (
    <div className="lg:col-span-2 bg-card p-4 md:p-6 rounded-2xl border-2 border-primary/10 flex flex-col h-full overflow-hidden">
      {/* Header with count */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h2 className="text-2xl font-semibold text-foreground">Todos os temas</h2>
        {!isLoading && (
          <Badge variant="secondary" className="bg-secondary/10 text-secondary hover:text-white">
            {filteredAndSortedThemes.length} temas
          </Badge>
        )}
      </div>

      {/* Search bar */}
      <div className="mb-4 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título ou marca..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-muted/30 border-border/30 focus:bg-background"
          />
        </div>
      </div>

      {/* Sort by date */}
      <div className="flex items-center justify-end mb-3 flex-shrink-0">
        <button
          onClick={toggleDateSort}
          className="inline-flex items-center gap-1 text-xs uppercase tracking-wider text-muted-foreground font-semibold hover:text-foreground transition-colors select-none"
        >
          Data de Criação
          <DateSortIcon className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="overflow-y-auto pr-2 flex-1 min-h-0">
        {isLoading ? (
          <LoadingState />
        ) : filteredAndSortedThemes.length > 0 ? (
          <ul className="space-y-3 animate-fade-in">
            {filteredAndSortedThemes.map((theme) => (
              <li key={theme.id}>
                <button
                  onClick={() => onSelectTheme(theme)}
                  className={cn(
                    "theme-card w-full text-left p-4 rounded-lg border-2 transition-all duration-200 flex items-center justify-between hover-scale",
                    selectedTheme?.id === theme.id
                      ? "bg-primary/10 border-primary shadow-md"
                      : "bg-muted/50 border-transparent hover:border-primary/50 hover:bg-primary/5"
                  )}
                >
                  <div className="flex items-center">
                    <div className="bg-gradient-to-br from-primary to-secondary text-white rounded-lg w-10 h-10 flex items-center justify-center font-bold text-xl mr-4">
                      {theme.title.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-lg text-foreground">{theme.title}</p>
                      <p className="text-sm text-muted-foreground">Marca: {brandMap.get(theme.brandId) || 'Não definida'}</p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground hidden md:block">
                    Criado em: {formatDate(theme.createdAt)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center text-muted-foreground py-8 animate-fade-in">
            {searchQuery.trim() ? (
              <>
                <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-base">Nenhum tema encontrado para "{searchQuery}"</p>
                <p className="text-sm mt-1 opacity-75">Tente buscar com outro termo.</p>
              </>
            ) : (
              <>
                <Palette className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-base">Nenhum tema encontrado</p>
                <p className="text-sm mt-1 opacity-75">Clique em "Novo tema" para começar.</p>
              </>
            )}
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
