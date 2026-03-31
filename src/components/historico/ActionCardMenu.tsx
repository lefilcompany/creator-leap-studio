import { useState } from 'react';
import { MoreHorizontal, Star, FolderOpen, Check, User, Users, ChevronRight, X, Trash2, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useCategories, useActionCategories } from '@/hooks/useCategories';
import type { FavoriteScope } from '@/hooks/useFavorites';

interface ActionCardMenuProps {
  actionId: string;
  isPersonalFavorite: boolean;
  isTeamFavorite: boolean;
  hasTeam: boolean;
  onToggleFavorite: (actionId: string, scope: FavoriteScope) => void;
  onDelete?: (actionId: string) => void;
  imageUrl?: string | null;
  size?: 'sm' | 'md';
}

export function ActionCardMenu({
  actionId,
  isPersonalFavorite,
  isTeamFavorite,
  hasTeam,
  onToggleFavorite,
  onDelete,
  size = 'md',
}: ActionCardMenuProps) {
  const { categories, addActionToCategory, removeActionFromCategory } = useCategories();
  const { data: actionCategories = [] } = useActionCategories(actionId);
  const actionCategoryIds = new Set(actionCategories.map(c => c.id));
  const [catPopoverOpen, setCatPopoverOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const isFavorited = isPersonalFavorite || isTeamFavorite;

  const handleToggleCategory = (categoryId: string) => {
    if (actionCategoryIds.has(categoryId)) {
      removeActionFromCategory.mutate({ categoryId, actionId });
    } else {
      addActionToCategory.mutate({ categoryId, actionId });
    }
  };

  const iconSize = size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4';

  return (
    <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
      <DropdownMenuTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "rounded-lg transition-all active:scale-95 hover:bg-muted/80",
            size === 'sm' ? 'p-1' : 'p-1.5'
          )}
          aria-label="Opções"
        >
          <MoreHorizontal className={cn(iconSize, "text-muted-foreground")} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52" onClick={(e) => e.stopPropagation()}>
        {/* Favorite options */}
        {hasTeam ? (
          <>
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(actionId, 'personal'); }}
              className="gap-2.5"
            >
              <User className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1">Favoritar para mim</span>
              {isPersonalFavorite && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 flex-shrink-0" />}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(actionId, 'team'); }}
              className="gap-2.5"
            >
              <Users className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1">Favoritar para equipe</span>
              {isTeamFavorite && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 flex-shrink-0" />}
            </DropdownMenuItem>
          </>
        ) : (
          <DropdownMenuItem
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(actionId, 'personal'); }}
            className="gap-2.5"
          >
            <Star className={cn("h-4 w-4 flex-shrink-0", isFavorited ? "fill-amber-400 text-amber-400" : "")} />
            <span className="flex-1">{isFavorited ? 'Remover favorito' : 'Favoritar'}</span>
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {/* Category — opens a popover */}
        <Popover open={catPopoverOpen} onOpenChange={setCatPopoverOpen}>
          <PopoverTrigger asChild>
            <button
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); setCatPopoverOpen(true); }}
              className="group/cat relative flex cursor-pointer items-center gap-2.5 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground w-full"
            >
              <FolderOpen className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1 text-left">
                {actionCategories.length > 0 ? 'Mudar categoria' : 'Adicionar à categoria'}
              </span>
              <ChevronRight className="h-3.5 w-3.5 ml-auto text-muted-foreground group-hover/cat:text-accent-foreground transition-colors" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-56 p-2"
            side="right"
            align="start"
            sideOffset={8}
            onClick={(e) => e.stopPropagation()}
            onInteractOutside={(e) => {
              e.preventDefault();
              setCatPopoverOpen(false);
            }}
          >
            {/* Current categories — show with remove button */}
            {actionCategories.length > 0 && (
              <>
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 pt-1 pb-1">
                  Atual
                </p>
                <div className="space-y-0.5 mb-1">
                  {actionCategories.map(cat => (
                    <div
                      key={cat.id}
                      className="flex items-center gap-2 px-2 py-1.5 rounded-md bg-primary/8"
                    >
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="truncate flex-1 text-sm font-medium text-primary">{cat.name}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); removeActionFromCategory.mutate({ categoryId: cat.id, actionId }); }}
                        className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors active:scale-95"
                        title="Remover desta categoria"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
                <DropdownMenuSeparator className="my-1" />
              </>
            )}

            {/* All categories to add */}
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 pt-1 pb-1">
              {actionCategories.length > 0 ? 'Mover para' : 'Categorias'}
            </p>
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground px-2 py-3 text-center">Nenhuma categoria criada</p>
            ) : (
              <div className="space-y-0.5 max-h-48 overflow-y-auto">
                {categories.filter(c => !actionCategoryIds.has(c.id)).length === 0 ? (
                  <p className="text-xs text-muted-foreground px-2 py-2 text-center">Já está em todas as categorias</p>
                ) : (
                  categories.filter(c => !actionCategoryIds.has(c.id)).map(cat => (
                    <button
                      key={cat.id}
                      onClick={(e) => { e.stopPropagation(); addActionToCategory.mutate({ categoryId: cat.id, actionId }); }}
                      className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors active:scale-[0.97] text-foreground hover:bg-muted/50"
                    >
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="truncate flex-1 text-left">{cat.name}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </PopoverContent>
        </Popover>

        {onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); onDelete(actionId); }}
              className="gap-2.5 text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1">Apagar</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
