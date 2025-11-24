import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Lock, Unlock, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { FabricObject } from 'fabric';

interface LayersPanelProps {
  objects: FabricObject[];
  selectedObject: FabricObject | null;
  onSelectObject: (obj: FabricObject) => void;
  onToggleVisibility: (obj: FabricObject) => void;
  onToggleLock: (obj: FabricObject) => void;
  onDeleteObject: (obj: FabricObject) => void;
}

export const LayersPanel = ({
  objects,
  selectedObject,
  onSelectObject,
  onToggleVisibility,
  onToggleLock,
  onDeleteObject
}: LayersPanelProps) => {
  const getObjectName = (obj: FabricObject): string => {
    if (obj.type === 'textbox') return 'Texto';
    if (obj.type === 'rect') return 'Retângulo';
    if (obj.type === 'circle') return 'Círculo';
    if (obj.type === 'triangle') return 'Triângulo';
    if (obj.type === 'polygon') return 'Estrela';
    if (obj.type === 'line') return 'Linha';
    return 'Elemento';
  };

  return (
    <div className="w-64 bg-card border-l border-border p-4">
      <h3 className="font-semibold text-sm mb-4">Camadas</h3>
      <div className="space-y-1">
        {objects.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Nenhuma camada ainda
          </p>
        ) : (
          objects.map((obj, index) => (
            <div
              key={index}
              className={cn(
                "flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-accent transition-colors",
                selectedObject === obj && "bg-accent"
              )}
              onClick={() => onSelectObject(obj)}
            >
              <span className="flex-1 text-sm truncate">
                {getObjectName(obj)}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleVisibility(obj);
                  }}
                >
                  {obj.visible ? (
                    <Eye className="h-3 w-3" />
                  ) : (
                    <EyeOff className="h-3 w-3" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleLock(obj);
                  }}
                >
                  {(obj as any).lockMovementX ? (
                    <Lock className="h-3 w-3" />
                  ) : (
                    <Unlock className="h-3 w-3" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-destructive hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteObject(obj);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
