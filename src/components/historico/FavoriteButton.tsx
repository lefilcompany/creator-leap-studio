import { useState } from 'react';
import { Star, User, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { FavoriteScope } from '@/hooks/useFavorites';

interface FavoriteButtonProps {
  actionId: string;
  isPersonalFavorite: boolean;
  isTeamFavorite: boolean;
  hasTeam: boolean;
  onToggle: (actionId: string, scope: FavoriteScope) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function FavoriteButton({
  actionId,
  isPersonalFavorite,
  isTeamFavorite,
  hasTeam,
  onToggle,
  className,
  size = 'md',
}: FavoriteButtonProps) {
  const [open, setOpen] = useState(false);
  const isFavorited = isPersonalFavorite || isTeamFavorite;
  const iconSize = size === 'sm' ? 'h-4 w-4' : 'h-4 w-4';

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!hasTeam) {
      // No team — just toggle personal
      onToggle(actionId, 'personal');
      return;
    }
    // Has team — show popover
    setOpen(!open);
  };

  const handleToggle = (scope: FavoriteScope, e: React.MouseEvent) => {
    e.stopPropagation();
    onToggle(actionId, scope);
    setOpen(false);
  };

  if (!hasTeam) {
    return (
      <button
        onClick={handleClick}
        className={cn(
          "p-1.5 rounded-lg transition-all active:scale-95",
          isFavorited ? "bg-amber-500/20 shadow-sm" : "hover:bg-muted",
          className
        )}
        aria-label={isFavorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
      >
        <Star className={cn(iconSize, "transition-colors", isFavorited ? "fill-amber-500 text-amber-600 drop-shadow-sm" : "text-muted-foreground")} />
      </button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          onClick={handleClick}
          className={cn(
            "p-1.5 rounded-lg transition-all active:scale-95",
            className
          )}
          aria-label="Favoritar"
        >
          <Star className={cn(iconSize, "transition-colors", isFavorited ? "fill-amber-400 text-amber-400" : "text-foreground")} />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-48 p-1.5"
        side="bottom"
        align="end"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={(e) => handleToggle('personal', e)}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors hover:bg-muted",
            isPersonalFavorite && "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400"
          )}
        >
          <User className="h-4 w-4 flex-shrink-0" />
          <span className="flex-1 text-left">Para mim</span>
          {isPersonalFavorite && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
        </button>
        <button
          onClick={(e) => handleToggle('team', e)}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors hover:bg-muted",
            isTeamFavorite && "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400"
          )}
        >
          <Users className="h-4 w-4 flex-shrink-0" />
          <span className="flex-1 text-left">Para a equipe</span>
          {isTeamFavorite && <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />}
        </button>
      </PopoverContent>
    </Popover>
  );
}
