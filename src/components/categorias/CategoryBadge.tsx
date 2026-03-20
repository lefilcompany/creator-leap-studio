import { cn } from '@/lib/utils';

interface CategoryBadgeProps {
  name: string;
  color: string;
  className?: string;
}

export function CategoryBadge({ name, color, className }: CategoryBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[10px] px-2 py-0.5 h-5 rounded-full font-medium border border-border/30 bg-card",
        className
      )}
    >
      <span
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: color }}
      />
      <span className="truncate max-w-[80px]">{name}</span>
    </span>
  );
}

export function NoCategoryBadge({ className }: { className?: string }) {
  return (
    <span className={cn("text-[10px] text-muted-foreground/60 italic", className)}>
      Sem nicho
    </span>
  );
}
