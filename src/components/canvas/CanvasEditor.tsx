import { useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas, Textbox, Rect, Circle, Triangle, Line, FabricObject, util, FabricImage, Polygon } from "fabric";
import { CanvasToolbar } from "./CanvasToolbar";
import { PropertiesPanel } from "./PropertiesPanel";
import { LayersPanel } from "./LayersPanel";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";
import { toast } from "sonner";
import { useCanvasHistory } from "@/hooks/useCanvasHistory";
import { AVAILABLE_FONTS } from "@/types/canvas";

interface CanvasEditorProps {
  backgroundImage: string;
  aspectRatio: string;
  onBack: () => void;
  onComplete: (canvasJSON: any, exportedImageURL: string) => void;
}

export const CanvasEditor = ({
  backgroundImage,
  aspectRatio,
  onBack,
  onComplete
}: CanvasEditorProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fabricCanvas, setFabricCanvas] = useState<FabricCanvas | null>(null);
  const [selectedObject, setSelectedObject] = useState<FabricObject | null>(null);
  const [objects, setObjects] = useState<FabricObject[]>([]);
  const { saveState, undo, redo, canUndo, canRedo } = useCanvasHistory();

  // Determinar dimensões baseado no aspect ratio
  const getDimensions = () => {
    const ratios: Record<string, { width: number; height: number }> = {
      "1:1": { width: 1080, height: 1080 },
      "9:16": { width: 1080, height: 1920 },
      "16:9": { width: 1920, height: 1080 },
      "4:3": { width: 1440, height: 1080 },
    };
    return ratios[aspectRatio] || { width: 1080, height: 1080 };
  };

  const dimensions = getDimensions();

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: Math.min(dimensions.width, 800),
      height: Math.min(dimensions.height, 800) * (dimensions.height / dimensions.width),
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
    });

    // Carregar imagem de fundo
    util.loadImage(backgroundImage, { crossOrigin: 'anonymous' }).then((img) => {
      const fabricImg = new FabricImage(img, {
        scaleX: canvas.width! / img.width,
        scaleY: canvas.height! / img.height,
        selectable: false,
        evented: false,
      });
      canvas.backgroundImage = fabricImg;
      canvas.renderAll();
    });

    // Event listeners
    canvas.on('selection:created', (e: any) => {
      setSelectedObject(e.selected[0]);
    });

    canvas.on('selection:updated', (e: any) => {
      setSelectedObject(e.selected[0]);
    });

    canvas.on('selection:cleared', () => {
      setSelectedObject(null);
    });

    canvas.on('object:modified', () => {
      saveState(JSON.stringify(canvas.toJSON()));
      updateObjects(canvas);
    });

    setFabricCanvas(canvas);
    saveState(JSON.stringify(canvas.toJSON()));

    return () => {
      canvas.dispose();
    };
  }, []);

  useEffect(() => {
    if (!fabricCanvas) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDelete();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fabricCanvas, canUndo, canRedo]);

  const updateObjects = (canvas: FabricCanvas) => {
    const allObjects = canvas.getObjects().filter(obj => obj.type !== 'image');
    setObjects([...allObjects]);
  };

  const addText = () => {
    if (!fabricCanvas) return;

    const text = new Textbox('Digite aqui', {
      left: fabricCanvas.width! / 2,
      top: fabricCanvas.height! / 2,
      fontSize: 40,
      fontFamily: 'Roboto',
      fill: '#000000',
      fontWeight: 700,
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
    });

    fabricCanvas.add(text);
    fabricCanvas.setActiveObject(text);
    saveState(JSON.stringify(fabricCanvas.toJSON()));
    updateObjects(fabricCanvas);
    toast.success("Texto adicionado");
  };

  const addRect = () => {
    if (!fabricCanvas) return;

    const rect = new Rect({
      left: fabricCanvas.width! / 2 - 50,
      top: fabricCanvas.height! / 2 - 50,
      width: 100,
      height: 100,
      fill: '#3b82f6',
      stroke: '#1e40af',
      strokeWidth: 2,
    });

    fabricCanvas.add(rect);
    fabricCanvas.setActiveObject(rect);
    saveState(JSON.stringify(fabricCanvas.toJSON()));
    updateObjects(fabricCanvas);
    toast.success("Retângulo adicionado");
  };

  const addCircle = () => {
    if (!fabricCanvas) return;

    const circle = new Circle({
      left: fabricCanvas.width! / 2 - 50,
      top: fabricCanvas.height! / 2 - 50,
      radius: 50,
      fill: '#10b981',
      stroke: '#059669',
      strokeWidth: 2,
    });

    fabricCanvas.add(circle);
    fabricCanvas.setActiveObject(circle);
    saveState(JSON.stringify(fabricCanvas.toJSON()));
    updateObjects(fabricCanvas);
    toast.success("Círculo adicionado");
  };

  const addTriangle = () => {
    if (!fabricCanvas) return;

    const triangle = new Triangle({
      left: fabricCanvas.width! / 2 - 50,
      top: fabricCanvas.height! / 2 - 50,
      width: 100,
      height: 100,
      fill: '#f59e0b',
      stroke: '#d97706',
      strokeWidth: 2,
    });

    fabricCanvas.add(triangle);
    fabricCanvas.setActiveObject(triangle);
    saveState(JSON.stringify(fabricCanvas.toJSON()));
    updateObjects(fabricCanvas);
    toast.success("Triângulo adicionado");
  };

  const addStar = () => {
    if (!fabricCanvas) return;

    // Criar estrela usando polígono
    const points = [];
    const outerRadius = 50;
    const innerRadius = 25;
    const numPoints = 5;

    for (let i = 0; i < numPoints * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (Math.PI * i) / numPoints;
      points.push({
        x: radius * Math.sin(angle),
        y: -radius * Math.cos(angle),
      });
    }

    const star = new Polygon(points, {
      left: fabricCanvas.width! / 2,
      top: fabricCanvas.height! / 2,
      fill: '#8b5cf6',
      stroke: '#7c3aed',
      strokeWidth: 2,
      originX: 'center',
      originY: 'center',
    });

    fabricCanvas.add(star);
    fabricCanvas.setActiveObject(star);
    saveState(JSON.stringify(fabricCanvas.toJSON()));
    updateObjects(fabricCanvas);
    toast.success("Estrela adicionada");
  };

  const addLine = () => {
    if (!fabricCanvas) return;

    const line = new Line(
      [fabricCanvas.width! / 2 - 50, fabricCanvas.height! / 2, fabricCanvas.width! / 2 + 50, fabricCanvas.height! / 2],
      {
        stroke: '#000000',
        strokeWidth: 4,
      }
    );

    fabricCanvas.add(line);
    fabricCanvas.setActiveObject(line);
    saveState(JSON.stringify(fabricCanvas.toJSON()));
    updateObjects(fabricCanvas);
    toast.success("Linha adicionada");
  };

  const handleUndo = () => {
    if (!fabricCanvas) return;
    const state = undo();
    if (state) {
      fabricCanvas.loadFromJSON(state, () => {
        fabricCanvas.renderAll();
        updateObjects(fabricCanvas);
      });
    }
  };

  const handleRedo = () => {
    if (!fabricCanvas) return;
    const state = redo();
    if (state) {
      fabricCanvas.loadFromJSON(state, () => {
        fabricCanvas.renderAll();
        updateObjects(fabricCanvas);
      });
    }
  };

  const handleDelete = () => {
    if (!fabricCanvas || !selectedObject) return;
    fabricCanvas.remove(selectedObject);
    saveState(JSON.stringify(fabricCanvas.toJSON()));
    updateObjects(fabricCanvas);
    toast.success("Elemento removido");
  };

  const handlePropertyChange = (property: string, value: any) => {
    if (!fabricCanvas || !selectedObject) return;

    if (property === 'fontFamily') {
      // Load Google Font before applying
      if (typeof window !== 'undefined' && (window as any).WebFont) {
        (window as any).WebFont.load({
          google: { families: [value] },
          active: () => {
            selectedObject.set(property, value);
            fabricCanvas.renderAll();
            saveState(JSON.stringify(fabricCanvas.toJSON()));
          }
        });
      }
    } else {
      selectedObject.set(property as any, value);
      fabricCanvas.renderAll();
      saveState(JSON.stringify(fabricCanvas.toJSON()));
    }
  };

  const handleExport = async () => {
    if (!fabricCanvas) return;

    // Export em alta resolução
    const multiplier = dimensions.width / fabricCanvas.width!;
    const dataURL = fabricCanvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: multiplier,
      enableRetinaScaling: false,
    });

    const canvasJSON = fabricCanvas.toJSON();
    onComplete(canvasJSON, dataURL);
  };

  const handleDownloadPreview = () => {
    if (!fabricCanvas) return;

    const dataURL = fabricCanvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 1,
      enableRetinaScaling: false,
    });

    const link = document.createElement('a');
    link.download = 'preview.png';
    link.href = dataURL;
    link.click();
    toast.success("Preview baixado!");
  };

  const handleSelectObject = (obj: FabricObject) => {
    if (!fabricCanvas) return;
    fabricCanvas.setActiveObject(obj);
    fabricCanvas.renderAll();
  };

  const handleToggleVisibility = (obj: FabricObject) => {
    obj.visible = !obj.visible;
    fabricCanvas?.renderAll();
    updateObjects(fabricCanvas!);
  };

  const handleToggleLock = (obj: FabricObject) => {
    const locked = !(obj as any).lockMovementX;
    (obj as any).lockMovementX = locked;
    (obj as any).lockMovementY = locked;
    (obj as any).lockRotation = locked;
    (obj as any).lockScalingX = locked;
    (obj as any).lockScalingY = locked;
    obj.selectable = !locked;
    fabricCanvas?.renderAll();
    updateObjects(fabricCanvas!);
  };

  const handleDeleteObject = (obj: FabricObject) => {
    if (!fabricCanvas) return;
    fabricCanvas.remove(obj);
    saveState(JSON.stringify(fabricCanvas.toJSON()));
    updateObjects(fabricCanvas);
    toast.success("Elemento removido");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-1 overflow-hidden">
        <CanvasToolbar
          onAddText={addText}
          onAddRect={addRect}
          onAddCircle={addCircle}
          onAddTriangle={addTriangle}
          onAddStar={addStar}
          onAddLine={addLine}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onDelete={handleDelete}
          canUndo={canUndo}
          canRedo={canRedo}
          hasSelection={!!selectedObject}
        />

        <div className="flex-1 p-8 overflow-auto bg-muted/30 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow-lg p-4">
            <canvas ref={canvasRef} />
          </div>
        </div>

        <div className="flex">
          <PropertiesPanel
            selectedObject={selectedObject}
            onPropertyChange={handlePropertyChange}
          />
          <LayersPanel
            objects={objects}
            selectedObject={selectedObject}
            onSelectObject={handleSelectObject}
            onToggleVisibility={handleToggleVisibility}
            onToggleLock={handleToggleLock}
            onDeleteObject={handleDeleteObject}
          />
        </div>
      </div>

      <div className="border-t border-border p-4 bg-card">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleDownloadPreview}>
              <Download className="mr-2 h-4 w-4" />
              Baixar Preview
            </Button>
            <Button onClick={handleExport}>
              Finalizar e Salvar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
