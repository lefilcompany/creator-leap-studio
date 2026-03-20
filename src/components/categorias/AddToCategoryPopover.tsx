import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { FolderOpen, Check, Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCategories, useActionCategories } from '@/hooks/useCategories';

interface AddToCategoryPopoverProps {
  actionId: string;
  children?: React.ReactNode;
}

export function AddToCategoryPopover({ actionId, children }: AddToCategoryPopoverProps) {
  const [open, setOpen] = useState(false);
  const { categories, addActionToCategory, removeActionFromCategory } = useCategories();
  const { data: actionCategories = [] } = useActionCategories(actionId);

  const actionCategoryIds = new Set(actionCategories.map(c => c.id));

  const handleToggle = (categoryId: string) => {
    if (actionCategoryIds.has(categoryId)) {
      removeActionFromCategory.mutate({ categoryId, actionId });
    } else {
      addActionToCategory.mutate({ categoryId, actionId });
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {children || (
          <Button variant="outline" size="sm" className="gap-2">
            <FolderOpen className="h-4 w-4" />
            Categoria
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="end">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1.5">
          Categorias
        </p>
        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground px-2 py-3 text-center">Nenhum nicho criado</p>
        ) : (
          <div className="space-y-0.5 max-h-48 overflow-y-auto">
            {categories.map(cat => {
              const isInCategory = actionCategoryIds.has(cat.id);
              return (
                <button
                  key={cat.id}
                  onClick={() => handleToggle(cat.id)}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-2 py-1.5 rounded-md text-sm transition-colors active:scale-[0.97]",
                    isInCategory
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-foreground hover:bg-muted/50"
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
  );
}
