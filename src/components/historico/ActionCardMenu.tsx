import { useState } from 'react';
import { MoreHorizontal, Star, FolderOpen, Check, User, Users, ChevronRight } from 'lucide-react';
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
  size?: 'sm' | 'md';
}

export function ActionCardMenu({
  actionId,
  isPersonalFavorite,
  isTeamFavorite,
  hasTeam,
  onToggleFavorite,
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

        {/* Category — opens a popover instead of sub-menu */}
        <Popover open={catPopoverOpen} onOpenChange={setCatPopoverOpen}>
          <PopoverTrigger asChild>
            <button
              onClick={(e) => { e.stopPropagation(); e.preventDefault(); setCatPopoverOpen(true); }}
              className="relative flex cursor-pointer items-center gap-2.5 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground w-full"
            >
              <FolderOpen className="h-4 w-4 flex-shrink-0" />
              <span className="flex-1 text-left">Adicionar à categoria</span>
              <ChevronRight className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-52 p-2"
            side="right"
            align="start"
            sideOffset={8}
            onClick={(e) => e.stopPropagation()}
            onInteractOutside={(e) => {
              // Don't close the dropdown when clicking inside the popover
              e.preventDefault();
              setCatPopoverOpen(false);
            }}
          >
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1.5">
              Categorias
            </p>
            {categories.length === 0 ? (
              <p className="text-sm text-muted-foreground px-2 py-3 text-center">Nenhuma categoria criada</p>
            ) : (
              <div className="space-y-0.5 max-h-48 overflow-y-auto">
                {categories.map(cat => {
                  const isInCategory = actionCategoryIds.has(cat.id);
                  return (
                    <button
                      key={cat.id}
                      onClick={(e) => { e.stopPropagation(); handleToggleCategory(cat.id); }}
                      className={cn(
                        "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors active:scale-[0.97]",
                        isInCategory ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted/50"
                      )}
                    >
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                      <span className="truncate flex-1 text-left">{cat.name}</span>
                      {isInCategory && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            )}
          </PopoverContent>
        </Popover>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
