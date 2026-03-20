import { FolderOpen, X } from 'lucide-react';
import { NativeSelect } from '@/components/ui/native-select';
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

  const selectedCategory = categories.find(c => c.id === value);

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-sm font-bold text-foreground flex items-center gap-2">
        <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
        Categoria <span className="text-muted-foreground font-normal text-xs">(opcional)</span>
      </Label>
      <div className="relative">
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
                ? "Nenhuma categoria criada"
                : "Sem categoria"
          }
          showClearOption={!isLoading && categories.length > 0}
          clearLabel="Sem categoria"
          disabled={disabled || isLoading || categories.length === 0}
          triggerClassName={cn(
            "h-10 rounded-xl border-0 bg-muted/30 shadow-sm hover:bg-muted/50 transition-colors text-sm",
            selectedCategory && "pr-9"
          )}
        />
        {selectedCategory && !disabled && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            className="absolute right-9 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
            title="Remover categoria"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {selectedCategory && (
        <div className="flex items-center gap-2 mt-0.5">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ backgroundColor: selectedCategory.color }}
          />
          <span className="text-[11px] text-muted-foreground">
            Será salva nesta categoria automaticamente
          </span>
        </div>
      )}
    </div>
  );
}
