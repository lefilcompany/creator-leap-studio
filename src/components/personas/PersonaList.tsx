'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Users, Search, ArrowUpDown, ArrowUp, ArrowDown, ChevronDown, ChevronRight, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import type { PersonaSummary } from '@/types/persona';
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

interface PersonaListProps {
  personas: PersonaSummary[] | undefined;
  brands: BrandSummary[];
  selectedPersona: PersonaSummary | null;
  onSelectPersona: (persona: PersonaSummary) => void;
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

const LoadingState = () => (
  <div className="flex flex-col items-center justify-center py-16 space-y-4">
    <div className="relative">
      <div className="w-16 h-16 border-4 border-primary/20 rounded-full"></div>
      <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-primary rounded-full animate-spin"></div>
    </div>
    <div className="text-center space-y-2">
      <h3 className="text-lg font-semibold text-foreground">Carregando personas</h3>
      <p className="text-sm text-muted-foreground">Aguarde um momento...</p>
    </div>
  </div>
);

type SortDirection = 'asc' | 'desc' | null;

interface BrandGroup {
  brandId: string;
  brandName: string;
  personas: PersonaSummary[];
}

interface PersonaCardProps {
  persona: PersonaSummary;
  isSelected: boolean;
  onSelect: (persona: PersonaSummary) => void;
}

const PersonaCard = ({ persona, isSelected, onSelect }: PersonaCardProps) => (
  <button
    onClick={() => onSelect(persona)}
    className={cn(
      "persona-card w-full text-left px-3 py-2 rounded-md border transition-all duration-200 flex items-center justify-between",
      isSelected
        ? "bg-primary/10 border-primary shadow-sm"
        : "bg-background/50 border-transparent hover:border-primary/30 hover:bg-primary/5"
    )}
  >
    <div className="flex items-center gap-2.5">
      <div className="bg-gradient-to-br from-primary to-secondary text-white rounded-md w-7 h-7 flex items-center justify-center font-semibold text-sm flex-shrink-0">
        {persona.name.charAt(0).toUpperCase()}
      </div>
      <p className="font-medium text-sm text-foreground">{persona.name}</p>
    </div>
    <span className="text-xs text-muted-foreground hidden md:block flex-shrink-0">
      {formatDate(persona.createdAt)}
    </span>
  </button>
);

interface BrandGroupSectionProps {
  group: BrandGroup;
  selectedPersona: PersonaSummary | null;
  onSelectPersona: (persona: PersonaSummary) => void;
  isExpanded: boolean;
  onToggle: () => void;
}

const BrandGroupSection = ({ group, selectedPersona, onSelectPersona, isExpanded, onToggle }: BrandGroupSectionProps) => (
  <div className="border border-border/30 rounded-lg overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-3 py-2 bg-muted/20 hover:bg-muted/40 transition-colors"
    >
      <div className="flex items-center gap-2">
        <Tag className="h-3.5 w-3.5 text-primary" />
        <span className="font-medium text-foreground text-sm">{group.brandName}</span>
        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 leading-none">
          {group.personas.length}
        </Badge>
      </div>
      {isExpanded ? (
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      ) : (
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
      )}
    </button>
    {isExpanded && (
      <ul className="p-1.5 space-y-1 animate-fade-in">
        {group.personas.map((persona) => (
          <li key={persona.id}>
            <PersonaCard
              persona={persona}
              isSelected={selectedPersona?.id === persona.id}
              onSelect={onSelectPersona}
            />
          </li>
        ))}
      </ul>
    )}
  </div>
);

export default function PersonaList({ personas, brands, selectedPersona, onSelectPersona, isLoading = false, currentPage, totalPages, onPageChange }: PersonaListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateSortDirection, setDateSortDirection] = useState<SortDirection>(null);
  const [collapsedBrands, setCollapsedBrands] = useState<Set<string>>(new Set());

  const brandMap = useMemo(() => new Map(brands.map(b => [b.id, b.name])), [brands]);

  const filteredPersonas = useMemo(() => {
    if (!personas || !Array.isArray(personas)) return [];

    let result = [...personas];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(p =>
        p.name.toLowerCase().includes(query) ||
        (brandMap.get(p.brandId) || '').toLowerCase().includes(query)
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
  }, [personas, searchQuery, dateSortDirection, brandMap]);

  const groupedByBrand = useMemo(() => {
    const groups = new Map<string, PersonaSummary[]>();

    for (const persona of filteredPersonas) {
      const list = groups.get(persona.brandId) || [];
      list.push(persona);
      groups.set(persona.brandId, list);
    }

    const result: BrandGroup[] = Array.from(groups.entries()).map(([brandId, personaList]) => ({
      brandId,
      brandName: brandMap.get(brandId) || 'Marca não encontrada',
      personas: personaList,
    }));

    result.sort((a, b) => a.brandName.localeCompare(b.brandName));
    return result;
  }, [filteredPersonas, brandMap]);

  const toggleBrandCollapse = (brandId: string) => {
    setCollapsedBrands(prev => {
      const next = new Set(prev);
      if (next.has(brandId)) {
        next.delete(brandId);
      } else {
        next.add(brandId);
      }
      return next;
    });
  };

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
    <div className="lg:col-span-2 bg-card p-4 md:p-6 rounded-2xl border-2 border-primary/10 flex flex-col min-h-[600px] lg:min-h-[700px] overflow-hidden">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h2 className="text-2xl font-semibold text-foreground">Todas as personas</h2>
        {!isLoading && (
          <Badge variant="secondary" className="bg-secondary/10 text-secondary hover:text-white">
            {filteredPersonas.length} personas
          </Badge>
        )}
      </div>

      <div className="mb-4 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou marca..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-muted/30 border-border/30 focus:bg-background"
          />
        </div>
      </div>

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
        ) : groupedByBrand.length > 0 ? (
          <div className="space-y-2 animate-fade-in">
            {groupedByBrand.map((group) => (
              <BrandGroupSection
                key={group.brandId}
                group={group}
                selectedPersona={selectedPersona}
                onSelectPersona={onSelectPersona}
                isExpanded={!collapsedBrands.has(group.brandId)}
                onToggle={() => toggleBrandCollapse(group.brandId)}
              />
            ))}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8 animate-fade-in">
            {searchQuery.trim() ? (
              <>
                <Search className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-base">Nenhuma persona encontrada para "{searchQuery}"</p>
                <p className="text-sm mt-1 opacity-75">Tente buscar com outro termo.</p>
              </>
            ) : (
              <>
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-base">Nenhuma persona encontrada</p>
                <p className="text-sm mt-1 opacity-75">Clique em "Nova persona" para começar.</p>
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
