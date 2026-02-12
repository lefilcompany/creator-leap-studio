'use client';

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Palette, Search, List, LayoutGrid, X, ChevronDown, ChevronRight, Filter } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { StrategicThemeSummary } from "@/types/theme";
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { motion, AnimatePresence } from 'framer-motion';

export interface BrandInfo {
  id: string;
  name: string;
  brandColor: string | null;
  avatarUrl: string | null;
}

interface ThemeListProps {
  themes: StrategicThemeSummary[];
  brands: BrandInfo[];
  isLoading?: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  initialViewMode?: string;
}

const DEFAULT_COLOR = 'hsl(var(--primary))';

const formatDate = (dateString: string) => {
  if (!dateString) return '';
  return new Date(dateString).toLocaleDateString('pt-BR');
};

type ViewMode = 'list' | 'grid';

interface BrandGroup {
  brand: BrandInfo;
  themes: StrategicThemeSummary[];
}

const LoadingGrid = () => (
  <div className="space-y-6">
    {Array.from({ length: 2 }).map((_, i) => (
      <div key={i} className="animate-pulse space-y-3">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 rounded-full bg-muted" />
          <div className="h-5 w-32 bg-muted rounded" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 pl-2">
          {Array.from({ length: 3 }).map((_, j) => (
            <div key={j} className="bg-card rounded-xl overflow-hidden shadow-sm flex">
              <div className="w-1.5 bg-muted rounded-l-xl" />
              <div className="p-5 space-y-3 flex-1">
                <div className="h-4 w-28 bg-muted rounded" />
                <div className="h-3 w-20 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

function ThemeCard({ theme, brandInfo, onSelect }: { theme: StrategicThemeSummary; brandInfo: BrandInfo | undefined; onSelect: () => void }) {
  const color = brandInfo?.brandColor || DEFAULT_COLOR;

  return (
    <div
      onClick={onSelect}
      className="cursor-pointer bg-card rounded-2xl overflow-hidden transition-all duration-300 group border border-border/30 hover:shadow-lg hover:scale-[1.01] hover:border-border/60 shadow-sm flex"
    >
      <div className="w-1.5 flex-shrink-0 rounded-l-2xl transition-all duration-300 group-hover:w-2" style={{ backgroundColor: color }} />
      
      <div className="p-4 space-y-3 flex-1 min-w-0">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-md transition-transform duration-300 group-hover:scale-105"
            style={{ backgroundColor: color }}
          >
            {theme.title.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <span className="font-semibold text-foreground truncate block text-sm">{theme.title}</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border/20">
          <span className="text-xs text-muted-foreground/70">
            {formatDate(theme.createdAt)}
          </span>
        </div>
      </div>
    </div>
  );
}

function BrandGroupHeader({ brand, themeCount, isOpen, onToggle }: { brand: BrandInfo; themeCount: number; isOpen: boolean; onToggle: () => void }) {
  const color = brand.brandColor || DEFAULT_COLOR;

  return (
    <button
      onClick={onToggle}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200",
        "hover:bg-muted/50 group cursor-pointer",
        isOpen && "bg-muted/30"
      )}
    >
      <div
        className="w-1 h-8 rounded-full flex-shrink-0 transition-all duration-300"
        style={{ backgroundColor: color }}
      />
      
      {brand.avatarUrl ? (
        <img
          src={brand.avatarUrl}
          alt={brand.name}
          className="w-8 h-8 rounded-lg object-cover flex-shrink-0 shadow-sm"
        />
      ) : (
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-sm"
          style={{ backgroundColor: color }}
        >
          {brand.name.charAt(0).toUpperCase()}
        </div>
      )}

      <div className="flex-1 text-left min-w-0">
        <span className="font-semibold text-foreground text-sm truncate block">{brand.name}</span>
      </div>

      <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full flex-shrink-0">
        {themeCount} {themeCount === 1 ? 'tema' : 'temas'}
      </span>

      <div className="text-muted-foreground transition-transform duration-200">
        {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
      </div>
    </button>
  );
}

export default function ThemeList({ themes, brands, isLoading = false, initialViewMode }: ThemeListProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrandId, setSelectedBrandId] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>((initialViewMode as ViewMode) || 'grid');
  const [openBrands, setOpenBrands] = useState<Set<string>>(new Set());
  const [allExpanded, setAllExpanded] = useState(false);

  const brandMap = useMemo(() => new Map(brands.map(b => [b.id, b])), [brands]);

  const filteredThemes = useMemo(() => {
    if (!themes || !Array.isArray(themes)) return [];
    let result = [...themes];

    if (selectedBrandId !== 'all') {
      result = result.filter(t => t.brandId === selectedBrandId);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      result = result.filter(t =>
        t.title.toLowerCase().includes(query) ||
        (brandMap.get(t.brandId)?.name || '').toLowerCase().includes(query)
      );
    }

    result.sort((a, b) => a.title.localeCompare(b.title));

    return result;
  }, [themes, searchQuery, selectedBrandId, brandMap]);

  // Group themes by brand
  const brandGroups = useMemo((): BrandGroup[] => {
    const groupMap = new Map<string, StrategicThemeSummary[]>();
    
    filteredThemes.forEach(t => {
      const list = groupMap.get(t.brandId) || [];
      list.push(t);
      groupMap.set(t.brandId, list);
    });

    const groups: BrandGroup[] = [];
    brands.forEach(brand => {
      const brandThemes = groupMap.get(brand.id);
      if (brandThemes && brandThemes.length > 0) {
        groups.push({ brand, themes: brandThemes });
      }
    });

    return groups;
  }, [filteredThemes, brands]);

  const handleSelectTheme = (theme: StrategicThemeSummary) => {
    navigate(`/themes/${theme.id}`, { state: { viewMode } });
  };

  const toggleBrand = (brandId: string) => {
    setOpenBrands(prev => {
      const next = new Set(prev);
      if (next.has(brandId)) {
        next.delete(brandId);
      } else {
        next.add(brandId);
      }
      return next;
    });
  };

  const toggleAll = () => {
    if (allExpanded) {
      setOpenBrands(new Set());
      setAllExpanded(false);
    } else {
      setOpenBrands(new Set(brands.map(b => b.id)));
      setAllExpanded(true);
    }
  };

  const hasActiveFilters = searchQuery.trim() || selectedBrandId !== 'all';

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedBrandId('all');
  };

  const EmptyState = () => (
    <div className="text-center text-muted-foreground py-16 animate-fade-in">
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
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9 h-10 bg-card shadow-sm border border-muted/50 focus:border-primary/40 focus:bg-background"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedBrandId} onValueChange={setSelectedBrandId}>
            <SelectTrigger className={cn(
              "h-10 w-[180px] shadow-sm border border-muted/50 bg-card",
              selectedBrandId !== 'all' && "bg-primary/10 border-primary/30 text-primary"
            )}>
              <Filter className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
              <SelectValue placeholder="Filtrar por marca" />
            </SelectTrigger>
            <SelectContent className="bg-popover z-50">
              <SelectItem value="all">Todas as marcas</SelectItem>
              {brands.map(brand => (
                <SelectItem key={brand.id} value={brand.id}>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: brand.brandColor || DEFAULT_COLOR }}
                    />
                    {brand.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={toggleAll}
            className="h-10 px-3 gap-1.5 shadow-sm border border-muted/50 text-muted-foreground"
            title={allExpanded ? 'Recolher todas' : 'Expandir todas'}
          >
            {allExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-10 px-3 text-muted-foreground shadow-sm border border-muted/50 hover:border-accent hover:bg-accent/20 hover:text-accent"
            >
              <X className="h-4 w-4 mr-1" /> Limpar
            </Button>
          )}

          <ToggleGroup
            type="single"
            value={viewMode}
            onValueChange={(v) => { if (v) setViewMode(v as ViewMode); }}
            className="bg-muted/50 shadow-sm rounded-lg p-0.5 gap-0 border border-muted/50 ml-auto"
          >
            <ToggleGroupItem
              value="grid"
              aria-label="Visualização em blocos"
              className="rounded-l-md rounded-r-none border-0 px-3 py-1.5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-sm data-[state=off]:bg-transparent data-[state=off]:hover:bg-muted"
            >
              <LayoutGrid className="h-4 w-4" />
            </ToggleGroupItem>
            <ToggleGroupItem
              value="list"
              aria-label="Visualização em lista"
              className="rounded-r-md rounded-l-none border-0 px-3 py-1.5 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground data-[state=on]:shadow-sm data-[state=off]:bg-transparent data-[state=off]:hover:bg-muted"
            >
              <List className="h-4 w-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>

      {/* Content grouped by brand */}
      {isLoading ? (
        <LoadingGrid />
      ) : brandGroups.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="space-y-3">
          {brandGroups.map(({ brand, themes: groupThemes }) => {
            const isOpen = openBrands.has(brand.id);
            const color = brand.brandColor || DEFAULT_COLOR;

            return (
              <div
                key={brand.id}
                className="bg-card/50 rounded-xl border border-border/20 overflow-hidden transition-all duration-200"
              >
                <BrandGroupHeader
                  brand={brand}
                  themeCount={groupThemes.length}
                  isOpen={isOpen}
                  onToggle={() => toggleBrand(brand.id)}
                />

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 pt-1">
                        {viewMode === 'grid' ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {groupThemes.map((theme) => (
                              <ThemeCard
                                key={theme.id}
                                theme={theme}
                                brandInfo={brand}
                                onSelect={() => handleSelectTheme(theme)}
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="bg-card rounded-xl shadow-sm overflow-hidden border border-muted/50">
                            <Table>
                              <TableHeader>
                                <TableRow className="hover:bg-transparent border-b border-border/20">
                                  <TableHead className="w-1 p-0" />
                                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">
                                    Tema
                                  </TableHead>
                                  <TableHead className="text-xs uppercase tracking-wider text-muted-foreground font-semibold text-right">
                                    Data de Criação
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {groupThemes.map((theme) => (
                                  <TableRow
                                    key={theme.id}
                                    onClick={() => handleSelectTheme(theme)}
                                    className="cursor-pointer transition-colors duration-150 border-b border-border/10 hover:bg-muted/50"
                                  >
                                    <TableCell className="w-1 p-0">
                                      <div className="w-1 h-full min-h-[48px] rounded-r-full" style={{ backgroundColor: color }} />
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex items-center gap-3">
                                        <div
                                          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 shadow-sm"
                                          style={{ backgroundColor: color }}
                                        >
                                          {theme.title.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="font-medium text-foreground">{theme.title}</span>
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-right">
                                      {formatDate(theme.createdAt)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
