import { FolderOpen, X, ChevronDown } from 'lucide-react';
import { NativeSelect } from '@/components/ui/native-select';
import { Label } from '@/components/ui/label';
import { useCategories } from '@/hooks/useCategories';
import { cn } from '@/lib/utils';

interface CategorySelectorProps {
  value: string;
  onChange: (categoryId: string) => void;
  className?: string;
  disabled?: boolean;
  /** Compact mode hides the label */
  compact?: boolean;
}

export function CategorySelector({ value, onChange, className, disabled, compact }: CategorySelectorProps) {
  const { categories, isLoading } = useCategories();

  const selectedCategory = categories.find(c => c.id === value);

  // When a category is selected, show a badge instead of the select
  if (selectedCategory && !disabled) {
    return (
      <div className={cn("space-y-1.5", className)}>
        {!compact && (
          <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
            <FolderOpen className="h-3 w-3" />
            Categoria
          </Label>
        )}
        <div
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-sm font-medium text-primary cursor-default"
        >
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: selectedCategory.color }}
          />
          <span className="truncate max-w-[180px]">{selectedCategory.name}</span>
          <button
            type="button"
            onClick={() => onChange("")}
            className="p-0.5 rounded hover:bg-destructive/15 hover:text-destructive transition-colors"
            title="Remover categoria"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("space-y-1.5", className)}>
      {!compact && (
        <Label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <FolderOpen className="h-3 w-3" />
          Categoria
        </Label>
      )}
      <NativeSelect
        value={value}
        onValueChange={(v) => onChange(v)}
        options={categories.map(cat => ({
          value: cat.id,
          label: cat.name,
        }))}
        placeholder={
          isLoading
            ? "Carregando..."
            : categories.length === 0
              ? "Nenhuma categoria"
              : "Sem categoria"
        }
        disabled={disabled || isLoading || categories.length === 0}
        triggerClassName="h-9 rounded-lg border-2 bg-background/50 hover:border-border/70 transition-colors text-xs border-border/50"
      />
    </div>
  );
}
