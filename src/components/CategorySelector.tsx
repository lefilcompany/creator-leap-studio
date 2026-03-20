import { FolderOpen } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { useCategories } from '@/hooks/useCategories';
import { cn } from '@/lib/utils';

interface CategorySelectorProps {
  value: string;
  onChange: (categoryId: string) => void;
  className?: string;
  disabled?: boolean;
}

export function CategorySelector({ value, onChange, className, disabled }: CategorySelectorProps) {
  const { categories, isLoading } = useCategories();

  if (isLoading || categories.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
        <FolderOpen className="h-3 w-3" />
        Categoria
      </Label>
      <div className="flex flex-wrap gap-1.5">
        {categories.map(cat => {
          const isSelected = value === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              disabled={disabled}
              onClick={() => onChange(isSelected ? "" : cat.id)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-[0.97]",
                isSelected
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/50 text-foreground shadow-sm hover:shadow-md hover:text-primary"
              )}
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: isSelected ? 'currentColor' : cat.color }}
              />
              {cat.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
