'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Package, Search, ArrowUpDown, ArrowUp, ArrowDown, List, LayoutGrid } from 'lucide-react';
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';

interface BrandListProps {
  brands: BrandSummary[] | undefined;
  selectedBrand: BrandSummary | null;
  onSelectBrand: (brand: BrandSummary) => void;
  isLoading?: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const DEFAULT_BRAND_COLOR = 'hsl(var(--primary))';

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('pt-BR');
};

type SortDirection = 'asc' | 'desc' | null;
type ViewMode = 'list' | 'grid';

// Loading skeleton for table rows
const LoadingRows = () => (
  <>
    {Array.from({ length: 5 }).map((_, i) => (
      <TableRow key={i} className="animate-pulse border-none">
        <TableCell>
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-muted" />
            <div className="h-4 w-32 bg-muted rounded" />
          </div>
        </TableCell>
        <TableCell><div className="h-4 w-40 bg-muted rounded" /></TableCell>
        <TableCell><div className="h-4 w-24 bg-muted rounded" /></TableCell>
      </TableRow>
    ))}
  </>
);

// Loading skeleton for grid
const LoadingGrid = () => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="animate-pulse bg-card rounded-xl border border-border/20 overflow-hidden">
        <div className="h-1 bg-muted" />
        <div className="p-5 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted" />
            <div className="h-5 w-28 bg-muted rounded" />
          </div>
          <div className="h-3 w-36 bg-muted rounded" />
          <div className="h-3 w-24 bg-muted rounded" />
        </div>
      </div>
    ))}
  </div>
);

// Grid card component
function BrandCard({ brand, isSelected, onSelect }: { brand: BrandSummary; isSelected: boolean; onSelect: () => void }) {
  const color = brand.brandColor || DEFAULT_BRAND_COLOR;

  return (
    <div
      onClick={onSelect}
      className={cn(
        "cursor-pointer bg-card rounded-xl overflow-hidden transition-all duration-200 hover:shadow-md border",
        isSelected
          ? "border-primary/40 shadow-md ring-1 ring-primary/20"
          : "border-border/20 hover:border-border/40"
      )}
    >
      <div className="h-1" style={{ backgroundColor: color }} />
      <div className="p-5 space-y-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
            style={{ backgroundColor: color }}
          >
            {brand.name.charAt(0).toUpperCase()}
          </div>
          <span className="font-semibold text-foreground truncate">{brand.name}</span>
        </div>
        <div className="text-sm text-muted-foreground truncate">{brand.responsible}</div>
        <div className="text-xs text-muted-foreground/70">{formatDate(brand.createdAt)}</div>
      </div>
    </div>
  );
}

export default function BrandList({ brands, selectedBrand, onSelectBrand, isLoading = false, currentPage, totalPages, onPageChange }: BrandListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateSortDirection, setDateSortDirection] = useState<SortDirection>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  const filteredAndSortedBrands = useMemo(() => {
    if (!brands || !Array.isArray(brands)) return [];
    
    let result = [...brands];
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(b => 
        b.name.toLowerCase().includes(query) ||
        b.responsible.toLowerCase().includes(query)
      );
    }
    
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
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 3) return [1, 2, 3, 4, '...', totalPages];
    if (currentPage >= totalPages - 2) return [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
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

  const EmptyState = () => (
    <div className="text-center text-muted-foreground py-16 animate-fade-in">
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
  );

  return (
    <div className="space-y-4">
      {/* Toolbar: search + view toggle */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou responsável..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-muted/30 border-border/30 focus:bg-background"
          />
        </div>
        <ToggleGroup
          type="single"
          value={viewMode}
          onValueChange={(v) => { if (v) setViewMode(v as ViewMode); }}
          size="sm"
          variant="outline"
        >
          <ToggleGroupItem value="list" aria-label="Visualização em lista">
            <List className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="grid" aria-label="Visualização em blocos">
            <LayoutGrid className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Content */}
      {isLoading ? (
        viewMode === 'list' ? (
          <Table>
            <TableBody><LoadingRows /></TableBody>
          </Table>
        ) : (
          <LoadingGrid />
        )
      ) : filteredAndSortedBrands.length === 0 ? (
        <EmptyState />
      ) : viewMode === 'list' ? (
        /* List view */
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-border/30">
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
            {filteredAndSortedBrands.map((brand) => (
              <TableRow
                key={brand.id}
                onClick={() => onSelectBrand(brand)}
                className={cn(
                  "cursor-pointer transition-colors duration-150 border-b border-border/10",
                  selectedBrand?.id === brand.id
                    ? "bg-primary/8 hover:bg-primary/12"
                    : "hover:bg-muted/50"
                )}
              >
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: brand.brandColor || DEFAULT_BRAND_COLOR }}
                    />
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
            ))}
          </TableBody>
        </Table>
      ) : (
        /* Grid view */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredAndSortedBrands.map((brand) => (
            <BrandCard
              key={brand.id}
              brand={brand}
              isSelected={selectedBrand?.id === brand.id}
              onSelect={() => onSelectBrand(brand)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && !isLoading && (
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
