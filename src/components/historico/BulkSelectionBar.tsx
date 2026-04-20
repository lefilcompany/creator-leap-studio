import { useState, useMemo } from 'react';
import { Star, FolderOpen, X, ChevronDown, User, Users, Plus, Minus, Trash2, Presentation } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useCategories } from '@/hooks/useCategories';
import type { FavoriteScope } from '@/hooks/useFavorites';

interface BulkSelectionBarProps {
  selectedIds: Set<string>;
  onClearSelection: () => void;
  onBulkFavorite: (scope: FavoriteScope) => void;
  onBulkAddToCategory: (categoryId: string) => void;
  onBulkRemoveFromCategory: (categoryId: string) => void;
  onBulkDelete?: () => void;
  onBulkExportPptx?: () => void;
  hasTeam: boolean;
  actionCategoryMap: Map<string, string[]>;
}

export function BulkSelectionBar({
  selectedIds,
  onClearSelection,
  onBulkFavorite,
  onBulkAddToCategory,
  onBulkRemoveFromCategory,
  onBulkDelete,
  onBulkExportPptx,
  hasTeam,
  actionCategoryMap,
}: BulkSelectionBarProps) {
  const { categories } = useCategories();
  const [catOpen, setCatOpen] = useState(false);
  const count = selectedIds.size;

  const handleExport = () => {
    if (!onBulkExportPptx) return;
    onBulkExportPptx();
  };

  // Find categories that at least one selected action belongs to (for removal)
  const categoriesWithSelected = useMemo(() => {
    const catCountMap = new Map<string, number>();
    selectedIds.forEach(actionId => {
      const cats = actionCategoryMap.get(actionId) || [];
      cats.forEach(catId => {
        catCountMap.set(catId, (catCountMap.get(catId) || 0) + 1);
      });
    });
    return catCountMap;
  }, [selectedIds, actionCategoryMap]);

  // Categories available to add (not all selected are already in them)
  const addableCategories = categories.filter(cat => {
    const inCount = categoriesWithSelected.get(cat.id) || 0;
    return inCount < count; // At least one selected action is NOT in this category
  });

  // Categories available to remove (at least one selected action is in them)
  const removableCategories = categories.filter(cat => {
    return (categoriesWithSelected.get(cat.id) || 0) > 0;
  });

  if (count === 0) return null;

  return (
    <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300">
      <div className="flex items-center gap-0.5 bg-card border border-border/60 shadow-xl rounded-full px-1.5 py-1 dark:bg-card dark:border-border/40">
        {/* Count */}
        <div className="flex items-center gap-1.5 pl-2 pr-1">
          <span className="bg-primary text-primary-foreground text-[11px] font-bold rounded-full w-5 h-5 flex items-center justify-center tabular-nums shadow-sm">
            {count}
          </span>
          <span className="text-xs font-medium text-foreground/80 whitespace-nowrap">
            {count === 1 ? 'selecionado' : 'selecionados'}
          </span>
        </div>

        <div className="w-px h-4 bg-border/50" />

        {/* Favorite */}
        {hasTeam ? (
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors active:scale-95">
                <Star className="h-3.5 w-3.5" />
                Favoritar
                <ChevronDown className="h-3 w-3 opacity-60" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-1" side="top" align="center" sideOffset={8}>
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 pt-1.5 pb-1">
                Favoritar como
              </p>
              <button
                onClick={() => onBulkFavorite('personal')}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-muted/60 transition-colors active:scale-[0.97]"
              >
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Para mim</span>
              </button>
              <button
                onClick={() => onBulkFavorite('team')}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm hover:bg-muted/60 transition-colors active:scale-[0.97]"
              >
                <Users className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Para a equipe</span>
              </button>
            </PopoverContent>
          </Popover>
        ) : (
          <button
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 transition-colors active:scale-95"
            onClick={() => onBulkFavorite('personal')}
          >
            <Star className="h-3.5 w-3.5" />
            Favoritar
          </button>
        )}

        {/* Category */}
        <Popover open={catOpen} onOpenChange={setCatOpen}>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-foreground/70 hover:bg-muted/60 transition-colors active:scale-95">
              <FolderOpen className="h-3.5 w-3.5" />
              Categoria
              <ChevronDown className="h-3 w-3 opacity-60" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-56 p-1.5" side="top" align="center" sideOffset={8}>
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground px-2 py-3 text-center">Nenhuma categoria criada</p>
            ) : (
              <div className="space-y-1">
                {/* Add to category */}
                {addableCategories.length > 0 && (
                  <>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 pt-1 pb-0.5">
                      Adicionar à
                    </p>
                    <div className="space-y-0.5 max-h-32 overflow-y-auto">
                      {addableCategories.map(cat => (
                        <button
                          key={cat.id}
                          onClick={() => {
                            onBulkAddToCategory(cat.id);
                            setCatOpen(false);
                          }}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors active:scale-[0.97] text-foreground hover:bg-muted/50"
                        >
                          <Plus className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                          <span className="truncate flex-1 text-left">{cat.name}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {/* Remove from category */}
                {removableCategories.length > 0 && (
                  <>
                    {addableCategories.length > 0 && <div className="border-t border-border/40 my-1" />}
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 pt-1 pb-0.5">
                      Remover de
                    </p>
                    <div className="space-y-0.5 max-h-32 overflow-y-auto">
                      {removableCategories.map(cat => {
                        const inCount = categoriesWithSelected.get(cat.id) || 0;
                        return (
                          <button
                            key={cat.id}
                            onClick={() => {
                              onBulkRemoveFromCategory(cat.id);
                              setCatOpen(false);
                            }}
                            className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors active:scale-[0.97] text-foreground hover:bg-destructive/10"
                          >
                            <Minus className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                            <span className="truncate flex-1 text-left">{cat.name}</span>
                            <span className="text-[10px] text-muted-foreground tabular-nums">{inCount}</span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </PopoverContent>
        </Popover>

        {/* Export PPT */}
        {onBulkExportPptx && (
          <>
            <div className="w-px h-4 bg-border/50" />
            <button
              onClick={handleExport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-foreground/70 hover:bg-muted/60 transition-colors active:scale-95"
            >
              <Presentation className="h-3.5 w-3.5" />
              Exportar PPT
            </button>
          </>
        )}

        {/* Delete */}
        {onBulkDelete && (
          <>
            <div className="w-px h-4 bg-border/50" />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors active:scale-95">
                  <Trash2 className="h-3.5 w-3.5" />
                  Apagar
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Mover para lixeira?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {count} {count === 1 ? 'item será movido' : 'itens serão movidos'} para a lixeira. Você poderá restaurá-los em até 30 dias.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={onBulkDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Apagar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}

        <div className="w-px h-4 bg-border/50" />

        {/* Clear */}
        <button
          onClick={onClearSelection}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors active:scale-95"
        >
          <X className="h-3.5 w-3.5" />
          Limpar
        </button>
      </div>
    </div>
  );
}
