'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Package, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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

// Loading skeleton for table rows
const LoadingRows = () => (
  <>
    {Array.from({ length: 5 }).map((_, i) => (
      <TableRow key={i} className="animate-pulse">
        <TableCell>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-muted" />
            <div className="h-4 w-32 bg-muted rounded" />
          </div>
        </TableCell>
        <TableCell><div className="h-4 w-40 bg-muted rounded" /></TableCell>
        <TableCell><div className="h-4 w-24 bg-muted rounded" /></TableCell>
      </TableRow>
    ))}
  </>
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
    if (event) event.preventDefault();
    if (typeof page === 'number' && page > 0 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
    }
  };

  const paginationRange = generatePagination(currentPage, totalPages);

  return (
    <div className="bg-card rounded-2xl border border-border/20 flex flex-col h-full overflow-hidden shadow-sm">
      <div className="overflow-y-auto flex-1 min-h-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-border/50">
              <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Marca</TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold hidden md:table-cell">Responsável</TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold text-right">Data de Criação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <LoadingRows />
            ) : sortedBrands.length > 0 ? (
              sortedBrands.map((brand) => (
                <TableRow
                  key={brand.id}
                  onClick={() => onSelectBrand(brand)}
                  className={cn(
                    "cursor-pointer transition-colors duration-150",
                    selectedBrand?.id === brand.id
                      ? "bg-primary/8 hover:bg-primary/12"
                      : "hover:bg-muted/50"
                  )}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="bg-gradient-to-br from-primary to-secondary text-white rounded-lg w-9 h-9 flex items-center justify-center font-bold text-sm flex-shrink-0">
                        {brand.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium text-foreground">{brand.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden md:table-cell">
                    {brand.responsible}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-right">
                    {formatDate(brand.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={3} className="h-48">
                  <div className="text-center text-muted-foreground animate-fade-in">
                    <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p className="text-base">Nenhuma marca encontrada</p>
                    <p className="text-sm mt-1 opacity-75">Clique em "Nova marca" para começar.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
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
