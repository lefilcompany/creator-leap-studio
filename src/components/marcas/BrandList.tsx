'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Package, Search, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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

type SortDirection = 'asc' | 'desc' | null;

export default function BrandList({ brands, selectedBrand, onSelectBrand, isLoading = false, currentPage, totalPages, onPageChange }: BrandListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateSortDirection, setDateSortDirection] = useState<SortDirection>(null);

  const filteredAndSortedBrands = useMemo(() => {
    if (!brands || !Array.isArray(brands)) return [];
    
    let result = [...brands];
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(b => 
        b.name.toLowerCase().includes(query) ||
        b.responsible.toLowerCase().includes(query)
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
      result.sort((a, b) => a.name.localeCompare(b.name));
    }
    
    return result;
  }, [brands, searchQuery, dateSortDirection]);

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
    <div className="bg-card rounded-2xl border border-border/20 flex flex-col h-full overflow-hidden shadow-sm">
      {/* Search bar */}
      <div className="p-3 border-b border-border/30 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou responsável..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-muted/30 border-border/30 focus:bg-background"
          />
        </div>
      </div>

      <div className="overflow-y-auto flex-1 min-h-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-border/50">
              <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Marca</TableHead>
              <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold hidden md:table-cell">Responsável</TableHead>
              <TableHead 
                className="text-xs uppercase tracking-wider text-muted-foreground font-semibold text-right cursor-pointer select-none hover:text-foreground transition-colors"
                onClick={toggleDateSort}
              >
                <span className="inline-flex items-center gap-1 justify-end">
                  Data de Criação
                  <DateSortIcon className="h-3.5 w-3.5" />
                </span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <LoadingRows />
            ) : filteredAndSortedBrands.length > 0 ? (
              filteredAndSortedBrands.map((brand) => (
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
                    {searchQuery.trim() ? (
                      <>
                        <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="text-base">Nenhuma marca encontrada para "{searchQuery}"</p>
                        <p className="text-sm mt-1 opacity-75">Tente buscar com outro termo.</p>
                      </>
                    ) : (
                      <>
                        <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="text-base">Nenhuma marca encontrada</p>
                        <p className="text-sm mt-1 opacity-75">Clique em "Nova marca" para começar.</p>
                      </>
                    )}
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
