import { useState } from 'react';
import { Star, FolderOpen, X, Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useCategories } from '@/hooks/useCategories';
import type { FavoriteScope } from '@/hooks/useFavorites';

interface BulkSelectionBarProps {
  selectedIds: Set<string>;
  onClearSelection: () => void;
  onBulkFavorite: (scope: FavoriteScope) => void;
  onBulkAddToCategory: (categoryId: string) => void;
  hasTeam: boolean;
}

export function BulkSelectionBar({
  selectedIds,
  onClearSelection,
  onBulkFavorite,
  onBulkAddToCategory,
  hasTeam,
}: BulkSelectionBarProps) {
  const { categories } = useCategories();
  const [catOpen, setCatOpen] = useState(false);
  const count = selectedIds.size;

  if (count === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-center gap-3 bg-card border border-border shadow-2xl rounded-2xl px-5 py-3">
        {/* Count */}
        <div className="flex items-center gap-2">
          <span className="bg-primary text-primary-foreground text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center tabular-nums">
            {count}
          </span>
          <span className="text-sm font-medium text-foreground whitespace-nowrap">
            {count === 1 ? 'selecionado' : 'selecionados'}
          </span>
        </div>

        <div className="w-px h-6 bg-border" />

        {/* Favorite */}
        {hasTeam ? (
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-400/10">
                <Star className="h-4 w-4" />
                Favoritar
                <ChevronDown className="h-3 w-3" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-44 p-1.5" side="top" align="center">
              <button
                onClick={() => onBulkFavorite('personal')}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-muted/50 transition-colors"
              >
                Para mim
              </button>
              <button
                onClick={() => onBulkFavorite('team')}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm hover:bg-muted/50 transition-colors"
              >
                Para a equipe
              </button>
            </PopoverContent>
          </Popover>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-400/10"
            onClick={() => onBulkFavorite('personal')}
          >
            <Star className="h-4 w-4" />
            Favoritar
          </Button>
        )}

        {/* Category */}
        <Popover open={catOpen} onOpenChange={setCatOpen}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2">
              <FolderOpen className="h-4 w-4" />
              Categoria
              <ChevronDown className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-2" side="top" align="center">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 pt-1 pb-1.5">
              Enviar para categoria
            </p>
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground px-2 py-3 text-center">Nenhuma categoria criada</p>
            ) : (
              <div className="space-y-0.5 max-h-48 overflow-y-auto">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      onBulkAddToCategory(cat.id);
                      setCatOpen(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors active:scale-[0.97] text-foreground hover:bg-muted/50"
                  >
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="truncate flex-1 text-left">{cat.name}</span>
                  </button>
                ))}
              </div>
            )}
          </PopoverContent>
        </Popover>

        <div className="w-px h-6 bg-border" />

        {/* Clear */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
          Limpar
        </Button>
      </div>
    </div>
  );
}
