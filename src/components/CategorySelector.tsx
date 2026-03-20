import { useState } from 'react';
import { FolderOpen, Plus, Check } from 'lucide-react';
import { NativeSelect } from '@/components/ui/native-select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
        Categoria
      </Label>
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
              : "Sem categoria (opcional)"
        }
        disabled={disabled || isLoading || categories.length === 0}
        triggerClassName="h-10 rounded-xl border-2 border-border bg-background hover:border-primary/40 transition-colors"
      />
      {selectedCategory && (
        <div className="flex items-center gap-2 mt-1">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: selectedCategory.color }}
          />
          <span className="text-xs text-muted-foreground">
            A ação será salva automaticamente nesta categoria
          </span>
        </div>
      )}
    </div>
  );
}
