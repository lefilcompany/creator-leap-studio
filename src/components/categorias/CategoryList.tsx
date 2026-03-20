import { FolderOpen, MoreHorizontal, Pencil, Trash2, Users, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { CategoryWithCount } from '@/types/category';
import { useAuth } from '@/hooks/useAuth';

interface CategoryListProps {
  categories: CategoryWithCount[];
  onSelect: (category: CategoryWithCount) => void;
  onEdit: (category: CategoryWithCount) => void;
  onDelete: (category: CategoryWithCount) => void;
  isLoading: boolean;
}

export function CategoryList({ categories, onSelect, onEdit, onDelete, isLoading }: CategoryListProps) {
  const { user } = useAuth();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse bg-card rounded-2xl p-5 space-y-3 border border-border/30">
            <div className="w-10 h-10 rounded-xl bg-muted" />
            <div className="h-5 w-3/4 bg-muted rounded" />
            <div className="h-3 w-1/2 bg-muted rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p className="text-base">Nenhuma categoria criada.</p>
        <p className="text-sm mt-1 opacity-75">Crie categorias para organizar suas ações.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {categories.map(cat => {
        const isOwner = cat.user_id === user?.id;
        return (
          <div
            key={cat.id}
            onClick={() => onSelect(cat)}
            className="cursor-pointer bg-card rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200 group relative"
          >
            {/* Color strip */}
            <div className="h-1.5 w-full" style={{ backgroundColor: cat.color }} />

            <div className="p-5">
            {/* Menu */}
            {isOwner && (
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEdit(cat)}>
                      <Pencil className="h-4 w-4 mr-2" /> Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDelete(cat)} className="text-destructive focus:text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" /> Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            )}

            {/* Icon */}
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
              style={{ backgroundColor: `${cat.color}20` }}
            >
              <FolderOpen className="h-5 w-5" style={{ color: cat.color }} />
            </div>

            {/* Name */}
            <h3 className="font-semibold text-foreground text-sm truncate mb-1">{cat.name}</h3>
            {cat.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{cat.description}</p>
            )}

            {/* Footer */}
            <div className="flex items-center gap-2 mt-auto pt-3 border-t border-border/20">
              <span className="text-xs text-muted-foreground tabular-nums">
                {cat.action_count} {cat.action_count === 1 ? 'ação' : 'ações'}
              </span>
              <Badge
                variant="outline"
                className={cn(
                  "text-[10px] px-1.5 py-0 h-4 ml-auto gap-1",
                  cat.visibility === 'team' ? "border-secondary/40 text-secondary" : "border-muted text-muted-foreground"
                )}
              >
                {cat.visibility === 'team' ? <Users className="h-2.5 w-2.5" /> : <User className="h-2.5 w-2.5" />}
                {cat.visibility === 'team' ? 'Equipe' : 'Pessoal'}
              </Badge>
            </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
