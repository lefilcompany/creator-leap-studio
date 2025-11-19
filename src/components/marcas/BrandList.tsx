'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Loader2, Package } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { BrandSummary } from '@/types/brand';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";

interface BrandListProps {
  brands: BrandSummary[] | undefined;
  selectedBrand: BrandSummary | null;
  onSelectBrand: (brand: BrandSummary) => void;
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
      <h3 className="text-lg font-semibold text-foreground">Carregando marcas</h3>
      <p className="text-sm text-muted-foreground">Aguarde um momento...</p>
    </div>
  </div>
);

export default function BrandList({ brands, selectedBrand, onSelectBrand, isLoading = false, currentPage, totalPages, onPageChange }: BrandListProps) {
  const sortedBrands = useMemo(() => {
    if (!brands || !Array.isArray(brands)) return [];
    return [...brands].sort((a, b) => a.name.localeCompare(b.name));
  }, [brands]);

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
    <div className="lg:col-span-2 bg-card p-4 md:p-6 rounded-2xl border-2 border-primary/10 flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h2 className="text-2xl font-semibold text-foreground">Todas as marcas</h2>
        {!isLoading && (
          <Badge variant="secondary" className="bg-secondary/10 text-secondary hover:text-white">
            {sortedBrands.length} marcas
          </Badge>
        )}
      </div>
      <div className="overflow-y-auto pr-2 flex-1 min-h-0">
        {isLoading ? (
          <LoadingState />
        ) : sortedBrands.length > 0 ? (
          <ul className="space-y-3 animate-fade-in">
            {sortedBrands.map((brand) => (
              <li key={brand.id}>
                <button
                  onClick={() => onSelectBrand(brand)}
                  className={cn(
                    "brand-card w-full text-left p-4 rounded-lg border-2 transition-all duration-200 flex items-center justify-between hover-scale",
                    selectedBrand?.id === brand.id
                      ? "bg-primary/10 border-primary shadow-md"
                      : "bg-muted/50 border-transparent hover:border-primary/50 hover:bg-primary/5"
                  )}
                >
                  <div className="flex items-center">
                    <div className="bg-gradient-to-br from-primary to-secondary text-white rounded-lg w-10 h-10 flex items-center justify-center font-bold text-xl mr-4">
                      {brand.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="brand-actions">
                      <p className="font-semibold text-lg text-foreground">{brand.name}</p>
                      <p className="text-sm text-muted-foreground">Responsável: {brand.responsible}</p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground hidden md:block">
                    Criado em: {formatDate(brand.createdAt)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="text-center text-muted-foreground py-8 animate-fade-in">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-base">Nenhuma marca encontrada</p>
            <p className="text-sm mt-1 opacity-75">Clique em "Nova marca" para começar.</p>
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