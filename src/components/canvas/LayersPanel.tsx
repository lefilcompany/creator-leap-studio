import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { FolderPlus } from "lucide-react";
import { CanvasLayer } from "@/types/canvas";
import { LayerItem } from "./LayerItem";
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

interface LayersPanelProps {
  layers: CanvasLayer[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string) => void;
  onReorderLayers: (startIndex: number, endIndex: number) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onDeleteLayer: (id: string) => void;
  onDuplicateLayer: (id: string) => void;
  onCreateGroup?: () => void;
}

export const LayersPanel = ({
  layers,
  selectedLayerId,
  onSelectLayer,
  onReorderLayers,
  onToggleVisibility,
  onToggleLock,
  onDeleteLayer,
  onDuplicateLayer,
  onCreateGroup
}: LayersPanelProps) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over || active.id === over.id) return;
    
    const oldIndex = layers.findIndex(l => l.id === active.id);
    const newIndex = layers.findIndex(l => l.id === over.id);
    
    if (oldIndex !== -1 && newIndex !== -1) {
      onReorderLayers(oldIndex, newIndex);
    }
  };

  return (
    <div className="w-80 bg-card border-l border-border flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-sm">Camadas</h3>
      </div>
      
      <ScrollArea className="flex-1">
        {layers.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Nenhuma camada ainda. Gere uma imagem ou adicione elementos para começar.
            </p>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={layers.map(l => l.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="py-2">
                {layers.map((layer) => (
                  <LayerItem
                    key={layer.id}
                    layer={layer}
                    isSelected={selectedLayerId === layer.id}
                    onSelect={() => onSelectLayer(layer.id)}
                    onToggleVisibility={() => onToggleVisibility(layer.id)}
                    onToggleLock={() => onToggleLock(layer.id)}
                    onDelete={() => onDeleteLayer(layer.id)}
                    onDuplicate={() => onDuplicateLayer(layer.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </ScrollArea>
      
      {onCreateGroup && (
        <div className="p-2 border-t border-border bg-muted/30">
          <Button
            size="sm"
            variant="ghost"
            className="w-full justify-start"
            onClick={onCreateGroup}
          >
            <FolderPlus className="mr-2 h-4 w-4" />
            Criar Grupo
          </Button>
        </div>
      )}
    </div>
  );
};
