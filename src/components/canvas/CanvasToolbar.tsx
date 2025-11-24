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
  Trash2,
  ImagePlus,
  Crop,
  ZoomIn,
  ZoomOut
} from "lucide-react";

interface CanvasToolbarProps {
  onAddText: () => void;
  onUploadImage: () => void;
  onAddRect: () => void;
  onAddCircle: () => void;
  onAddTriangle: () => void;
  onAddStar: () => void;
  onAddLine: () => void;
  onCrop: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onDelete: () => void;
  canUndo: boolean;
  canRedo: boolean;
  hasSelection: boolean;
}

export const CanvasToolbar = ({
  onAddText,
  onUploadImage,
  onAddRect,
  onAddCircle,
  onAddTriangle,
  onAddStar,
  onAddLine,
  onCrop,
  onZoomIn,
  onZoomOut,
  onUndo,
  onRedo,
  onDelete,
  canUndo,
  canRedo,
  hasSelection
}: CanvasToolbarProps) => {
  return (
    <div className="flex flex-col gap-1 p-3 bg-card border-r border-border w-16">
      {/* Ferramentas de Conteúdo */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onAddText}
        className="w-full aspect-square"
        title="Adicionar Texto (T)"
      >
        <Type className="h-5 w-5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={onUploadImage}
        className="w-full aspect-square"
        title="Upload de Imagem (I)"
      >
        <ImagePlus className="h-5 w-5" />
      </Button>

      <Separator />

      {/* Formas */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onAddRect}
        className="w-full aspect-square"
        title="Retângulo (R)"
      >
        <Square className="h-5 w-5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={onAddCircle}
        className="w-full aspect-square"
        title="Círculo (C)"
      >
        <Circle className="h-5 w-5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={onAddTriangle}
        className="w-full aspect-square"
        title="Triângulo"
      >
        <Triangle className="h-5 w-5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={onAddStar}
        className="w-full aspect-square"
        title="Estrela"
      >
        <Star className="h-5 w-5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={onAddLine}
        className="w-full aspect-square"
        title="Linha"
      >
        <Minus className="h-5 w-5" />
      </Button>

      <Separator />

      {/* Ferramentas Extras */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onCrop}
        className="w-full aspect-square"
        title="Recortar"
      >
        <Crop className="h-5 w-5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={onZoomIn}
        className="w-full aspect-square"
        title="Zoom In (+)"
      >
        <ZoomIn className="h-5 w-5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={onZoomOut}
        className="w-full aspect-square"
        title="Zoom Out (-)"
      >
        <ZoomOut className="h-5 w-5" />
      </Button>

      <Separator />

      {/* Histórico */}
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
        className="w-full aspect-square text-destructive hover:text-destructive disabled:text-muted-foreground"
        title="Deletar (Delete)"
      >
        <Trash2 className="h-5 w-5" />
      </Button>
    </div>
  );
};
