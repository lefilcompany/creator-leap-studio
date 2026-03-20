import { useState } from 'react';
import { MoreHorizontal, Star, FolderOpen, Check, User, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "p-1.5 rounded-lg transition-all active:scale-95 hover:bg-muted/80",
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

        {/* Category sub-menu */}
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-2.5">
            <FolderOpen className="h-4 w-4 flex-shrink-0" />
            <span>Adicionar à categoria</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-48">
            {categories.length === 0 ? (
              <div className="text-sm text-muted-foreground px-3 py-3 text-center">
                Nenhuma categoria criada
              </div>
            ) : (
              categories.map(cat => {
                const isInCategory = actionCategoryIds.has(cat.id);
                return (
                  <DropdownMenuItem
                    key={cat.id}
                    onClick={(e) => { e.stopPropagation(); handleToggleCategory(cat.id); }}
                    className={cn(
                      "gap-2.5",
                      isInCategory && "bg-primary/10 text-primary font-medium"
                    )}
                  >
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="truncate flex-1">{cat.name}</span>
                    {isInCategory && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
                  </DropdownMenuItem>
                );
              })
            )}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
