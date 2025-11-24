import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Eye, EyeOff, Lock, Unlock, MoreVertical, Copy, Trash2, GripVertical, Image, Type, Square } from "lucide-react";
import { cn } from "@/lib/utils";
import { CanvasLayer } from "@/types/canvas";
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface LayerItemProps {
  layer: CanvasLayer;
  isSelected: boolean;
  onSelect: () => void;
  onToggleVisibility: () => void;
  onToggleLock: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
}

const getLayerIcon = (type: string) => {
  switch (type) {
    case 'text':
      return <Type className="h-4 w-4" />;
    case 'image':
    case 'background':
      return <Image className="h-4 w-4" />;
    case 'shape':
      return <Square className="h-4 w-4" />;
    default:
      return <Square className="h-4 w-4" />;
  }
};

const getLayerTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    background: 'Fundo',
    image: 'Imagem',
    text: 'Texto',
    shape: 'Forma',
    group: 'Grupo'
  };
  return labels[type] || type;
};

export const LayerItem = ({
  layer,
  isSelected,
  onSelect,
  onToggleVisibility,
  onToggleLock,
  onDelete,
  onDuplicate
}: LayerItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: layer.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-2 p-2 mx-2 my-1 rounded-md cursor-pointer hover:bg-accent/50 transition-colors",
        isSelected && "bg-accent border border-primary"
      )}
      onClick={onSelect}
    >
      {/* Drag Handle */}
      <div
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing flex-shrink-0"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </div>

      {/* Miniatura */}
      <div className="w-12 h-12 bg-muted rounded border overflow-hidden flex-shrink-0">
        {layer.thumbnail ? (
          <img
            src={layer.thumbnail}
            alt={layer.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            {getLayerIcon(layer.type)}
          </div>
        )}
      </div>

      {/* Nome da Camada */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{layer.name}</p>
        <p className="text-xs text-muted-foreground">{getLayerTypeLabel(layer.type)}</p>
      </div>

      {/* Ações */}
      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onToggleVisibility}
          title={layer.visible ? "Ocultar" : "Mostrar"}
        >
          {layer.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
        </Button>

        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={onToggleLock}
          title={layer.locked ? "Desbloquear" : "Bloquear"}
        >
          {layer.locked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7">
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Remover
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
