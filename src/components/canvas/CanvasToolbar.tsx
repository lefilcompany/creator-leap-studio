import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Type, 
  Square, 
  Circle, 
  Triangle, 
  Star, 
  Minus, 
  Undo, 
  Redo, 
  Trash2 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CanvasToolbarProps {
  onAddText: () => void;
  onAddRect: () => void;
  onAddCircle: () => void;
  onAddTriangle: () => void;
  onAddStar: () => void;
  onAddLine: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onDelete: () => void;
  canUndo: boolean;
  canRedo: boolean;
  hasSelection: boolean;
}

export const CanvasToolbar = ({
  onAddText,
  onAddRect,
  onAddCircle,
  onAddTriangle,
  onAddStar,
  onAddLine,
  onUndo,
  onRedo,
  onDelete,
  canUndo,
  canRedo,
  hasSelection
}: CanvasToolbarProps) => {
  return (
    <div className="flex flex-col gap-2 p-4 bg-card border-r border-border w-16">
      <Button
        variant="ghost"
        size="icon"
        onClick={onAddText}
        className="w-full aspect-square"
        title="Adicionar Texto (T)"
      >
        <Type className="h-5 w-5" />
      </Button>

      <Separator />

      <Button
        variant="ghost"
        size="icon"
        onClick={onAddRect}
        className="w-full aspect-square"
        title="Adicionar Retângulo"
      >
        <Square className="h-5 w-5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={onAddCircle}
        className="w-full aspect-square"
        title="Adicionar Círculo"
      >
        <Circle className="h-5 w-5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={onAddTriangle}
        className="w-full aspect-square"
        title="Adicionar Triângulo"
      >
        <Triangle className="h-5 w-5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={onAddStar}
        className="w-full aspect-square"
        title="Adicionar Estrela"
      >
        <Star className="h-5 w-5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={onAddLine}
        className="w-full aspect-square"
        title="Adicionar Linha"
      >
        <Minus className="h-5 w-5" />
      </Button>

      <Separator />

      <Button
        variant="ghost"
        size="icon"
        onClick={onUndo}
        disabled={!canUndo}
        className="w-full aspect-square"
        title="Desfazer (Ctrl+Z)"
      >
        <Undo className="h-5 w-5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={onRedo}
        disabled={!canRedo}
        className="w-full aspect-square"
        title="Refazer (Ctrl+Y)"
      >
        <Redo className="h-5 w-5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={onDelete}
        disabled={!hasSelection}
        className={cn(
          "w-full aspect-square",
          hasSelection && "text-destructive hover:text-destructive"
        )}
        title="Deletar (Delete)"
      >
        <Trash2 className="h-5 w-5" />
      </Button>
    </div>
  );
};
