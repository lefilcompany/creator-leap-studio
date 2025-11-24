import { useCallback, useEffect, useRef, useState } from "react";
import { Canvas as FabricCanvas, Textbox, Rect, Circle, Triangle, Line, FabricObject, util, FabricImage, Polygon } from "fabric";
import { CanvasToolbar } from "./CanvasToolbar";
import { PropertiesPanel } from "./PropertiesPanel";
import { LayersPanel } from "./LayersPanel";
import { ZoomControls } from "./ZoomControls";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Download, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useCanvasHistory } from "@/hooks/useCanvasHistory";
import { useCanvasLayers } from "@/hooks/useCanvasLayers";
import { CanvasLayer } from "@/types/canvas";

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
  const [zoom, setZoom] = useState(1);
  const [isLoadingCanvas, setIsLoadingCanvas] = useState(true);
  const isInitialized = useRef(false);
  const layersRef = useRef<CanvasLayer[]>([]);
  
  const { saveState, undo, redo, canUndo, canRedo } = useCanvasHistory();
  const {
    layers,
    selectedLayerId,
    setSelectedLayerId,
    addLayer,
    removeLayer,
    updateLayer,
    reorderLayers,
    toggleVisibility,
    toggleLock,
    duplicateLayer,
    generateThumbnail,
    clearLayers,
  } = useCanvasLayers();

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

  // Sincroniza layersRef com layers para evitar re-renderizações nos listeners
  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);

  // Inicialização do canvas
  useEffect(() => {
    if (!canvasRef.current || isInitialized.current) return;
    
    isInitialized.current = true;
    clearLayers(); // Limpa camadas antigas
    setIsLoadingCanvas(true);
    
    // Calcula tamanho baseado no espaço disponível (não limitar a 800px!)
    const availableWidth = typeof window !== 'undefined' 
      ? window.innerWidth - 64 - 288 - 80  // toolbar (64px) + painel lateral (288px) + padding (80px)
      : 1000;

    const availableHeight = typeof window !== 'undefined'
      ? window.innerHeight - 200  // header + footer
      : 800;

    const scale = Math.min(
      availableWidth / dimensions.width,
      availableHeight / dimensions.height,
      1 // não aumentar além do tamanho real
    );

    const canvas = new FabricCanvas(canvasRef.current, {
      width: dimensions.width * scale,
      height: dimensions.height * scale,
      backgroundColor: '#ffffff',
      preserveObjectStacking: true,
    });

    // Carregar imagem de fundo
    util.loadImage(backgroundImage, { crossOrigin: 'anonymous' })
      .then((img) => {
        console.log('🖼️ Imagem de fundo carregada:', {
          imageWidth: img.width,
          imageHeight: img.height,
          canvasWidth: canvas.width,
          canvasHeight: canvas.height,
        });

        const fabricImg = new FabricImage(img, {
          scaleX: canvas.width! / img.width,
          scaleY: canvas.height! / img.height,
          selectable: false,
          evented: false,
        });
        
        canvas.backgroundImage = fabricImg;
        canvas.requestRenderAll(); // Força re-render completo

        console.log('✅ Background definido no canvas');

        // Adicionar camada de fundo
        addLayer({
          id: 'background-layer',
          name: 'Imagem de Fundo',
          type: 'background',
          fabricObject: fabricImg,
          visible: true,
          locked: true,
          opacity: 1,
          zIndex: 0,
          thumbnail: generateThumbnail(fabricImg, canvas),
        });

        // ✅ SÓ AGORA setar o canvas no estado (depois da imagem estar carregada)
        setFabricCanvas(canvas);
        saveState(JSON.stringify(canvas.toJSON()));
        setIsLoadingCanvas(false);
        
        console.log('✅ Canvas pronto e configurado!');
      })
      .catch((error) => {
        console.error('❌ Erro ao carregar imagem de fundo:', error);
        toast.error('Erro ao carregar imagem de fundo');
        setIsLoadingCanvas(false);
      });

    // Event listeners (sem dependência em layers para evitar re-criação)
    const handleSelection = (e: any) => {
      const selected = e.selected[0];
      setSelectedObject(selected);
      const layer = layersRef.current.find(l => l.fabricObject === selected);
      if (layer) setSelectedLayerId(layer.id);
    };

    const handleSelectionCleared = () => {
      setSelectedObject(null);
      setSelectedLayerId(null);
    };

    const handleObjectModified = (e: any) => {
      saveState(JSON.stringify(canvas.toJSON()));
      if (e.target) {
        const layer = layersRef.current.find(l => l.fabricObject === e.target);
        if (layer) {
          updateLayer(layer.id, {
            thumbnail: generateThumbnail(e.target, canvas)
          });
        }
      }
    };

    // Event listeners (configurados antes do carregamento da imagem)
    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', handleSelectionCleared);
    canvas.on('object:modified', handleObjectModified);

    return () => {
      canvas.off('selection:created', handleSelection);
      canvas.off('selection:updated', handleSelection);
      canvas.off('selection:cleared', handleSelectionCleared);
      canvas.off('object:modified', handleObjectModified);
      canvas.dispose();
    };
  }, [backgroundImage, aspectRatio]);

  // Atalhos de teclado
  useEffect(() => {
    if (!fabricCanvas) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevenir atalhos se estiver editando texto
      if ((e.target as HTMLElement).tagName === 'INPUT' || 
          (e.target as HTMLElement).tagName === 'TEXTAREA') {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        handleRedo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handleDelete();
      } else if (e.key === 't' || e.key === 'T') {
        e.preventDefault();
        addText();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        addRect();
      } else if (e.key === 'c' || e.key === 'C') {
        e.preventDefault();
        addCircle();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        handleZoomOut();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [fabricCanvas, canUndo, canRedo]);

  // Sincronizar seleção com camadas
  useEffect(() => {
    if (!fabricCanvas || !selectedLayerId) return;
    
    const layer = layers.find(l => l.id === selectedLayerId);
    if (layer && layer.fabricObject !== fabricCanvas.getActiveObject()) {
      fabricCanvas.setActiveObject(layer.fabricObject);
      fabricCanvas.renderAll();
    }
  }, [selectedLayerId, layers, fabricCanvas]);

  // Funções para adicionar elementos
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
    
    const layerId = `text-${Date.now()}`;
    addLayer({
      id: layerId,
      name: 'Texto',
      type: 'text',
      fabricObject: text,
      visible: true,
      locked: false,
      opacity: 1,
      zIndex: layers.length,
      thumbnail: generateThumbnail(text, fabricCanvas),
    });
    
    saveState(JSON.stringify(fabricCanvas.toJSON()));
    toast.success("Texto adicionado");
  };

  const handleUploadImage = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file && fabricCanvas) {
        const reader = new FileReader();
        reader.onload = (event) => {
          util.loadImage(event.target?.result as string, { crossOrigin: 'anonymous' }).then((img) => {
            const fabricImg = new FabricImage(img, {
              left: 100,
              top: 100,
              scaleX: 0.3,
              scaleY: 0.3,
            });
            
            fabricCanvas.add(fabricImg);
            fabricCanvas.setActiveObject(fabricImg);
            
            const layerId = `image-${Date.now()}`;
            addLayer({
              id: layerId,
              name: 'Imagem',
              type: 'image',
              fabricObject: fabricImg,
              visible: true,
              locked: false,
              opacity: 1,
              zIndex: layers.length,
              thumbnail: generateThumbnail(fabricImg, fabricCanvas),
            });
            
            fabricCanvas.renderAll();
            saveState(JSON.stringify(fabricCanvas.toJSON()));
            toast.success("Imagem adicionada");
          });
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
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
    
    const layerId = `rect-${Date.now()}`;
    addLayer({
      id: layerId,
      name: 'Retângulo',
      type: 'shape',
      fabricObject: rect,
      visible: true,
      locked: false,
      opacity: 1,
      zIndex: layers.length,
      thumbnail: generateThumbnail(rect, fabricCanvas),
    });
    
    saveState(JSON.stringify(fabricCanvas.toJSON()));
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
    
    const layerId = `circle-${Date.now()}`;
    addLayer({
      id: layerId,
      name: 'Círculo',
      type: 'shape',
      fabricObject: circle,
      visible: true,
      locked: false,
      opacity: 1,
      zIndex: layers.length,
      thumbnail: generateThumbnail(circle, fabricCanvas),
    });
    
    saveState(JSON.stringify(fabricCanvas.toJSON()));
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
    
    const layerId = `triangle-${Date.now()}`;
    addLayer({
      id: layerId,
      name: 'Triângulo',
      type: 'shape',
      fabricObject: triangle,
      visible: true,
      locked: false,
      opacity: 1,
      zIndex: layers.length,
      thumbnail: generateThumbnail(triangle, fabricCanvas),
    });
    
    saveState(JSON.stringify(fabricCanvas.toJSON()));
    toast.success("Triângulo adicionado");
  };

  const addStar = () => {
    if (!fabricCanvas) return;

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
    
    const layerId = `star-${Date.now()}`;
    addLayer({
      id: layerId,
      name: 'Estrela',
      type: 'shape',
      fabricObject: star,
      visible: true,
      locked: false,
      opacity: 1,
      zIndex: layers.length,
      thumbnail: generateThumbnail(star, fabricCanvas),
    });
    
    saveState(JSON.stringify(fabricCanvas.toJSON()));
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
    
    const layerId = `line-${Date.now()}`;
    addLayer({
      id: layerId,
      name: 'Linha',
      type: 'shape',
      fabricObject: line,
      visible: true,
      locked: false,
      opacity: 1,
      zIndex: layers.length,
      thumbnail: generateThumbnail(line, fabricCanvas),
    });
    
    saveState(JSON.stringify(fabricCanvas.toJSON()));
    toast.success("Linha adicionada");
  };

  // Zoom functions
  const handleZoomIn = () => {
    if (!fabricCanvas) return;
    const newZoom = Math.min(zoom * 1.1, 2);
    setZoom(newZoom);
    fabricCanvas.setZoom(newZoom);
    fabricCanvas.renderAll();
  };

  const handleZoomOut = () => {
    if (!fabricCanvas) return;
    const newZoom = Math.max(zoom / 1.1, 0.25);
    setZoom(newZoom);
    fabricCanvas.setZoom(newZoom);
    fabricCanvas.renderAll();
  };

  const handleZoomChange = (value: number) => {
    if (!fabricCanvas) return;
    setZoom(value);
    fabricCanvas.setZoom(value);
    fabricCanvas.renderAll();
  };

  const handleFitToScreen = () => {
    if (!fabricCanvas) return;
    setZoom(1);
    fabricCanvas.setZoom(1);
    fabricCanvas.renderAll();
  };

  const handleCrop = () => {
    toast.info('Ferramenta de recorte em desenvolvimento');
  };

  const handleUndo = () => {
    if (!fabricCanvas) return;
    const state = undo();
    if (state) {
      fabricCanvas.loadFromJSON(state, () => {
        fabricCanvas.renderAll();
      });
    }
  };

  const handleRedo = () => {
    if (!fabricCanvas) return;
    const state = redo();
    if (state) {
      fabricCanvas.loadFromJSON(state, () => {
        fabricCanvas.renderAll();
      });
    }
  };

  const handleDelete = () => {
    if (!fabricCanvas || !selectedObject || !selectedLayerId) return;
    
    fabricCanvas.remove(selectedObject);
    removeLayer(selectedLayerId);
    saveState(JSON.stringify(fabricCanvas.toJSON()));
    toast.success("Elemento removido");
  };

  const handlePropertyChange = (property: string, value: any) => {
    if (!fabricCanvas || !selectedObject) return;

    if (property === 'fontFamily') {
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

  // Layer panel handlers
  const handleSelectLayer = (id: string) => {
    if (!fabricCanvas) return;
    const layer = layers.find(l => l.id === id);
    if (layer && !layer.locked) {
      fabricCanvas.setActiveObject(layer.fabricObject);
      fabricCanvas.renderAll();
      setSelectedObject(layer.fabricObject);
      setSelectedLayerId(id);
    }
  };

  const handleToggleVisibility = (id: string) => {
    const layer = layers.find(l => l.id === id);
    if (layer) {
      layer.fabricObject.visible = !layer.fabricObject.visible;
      toggleVisibility(id);
      fabricCanvas?.renderAll();
    }
  };

  const handleToggleLock = (id: string) => {
    const layer = layers.find(l => l.id === id);
    if (layer) {
      const locked = !layer.locked;
      (layer.fabricObject as any).lockMovementX = locked;
      (layer.fabricObject as any).lockMovementY = locked;
      (layer.fabricObject as any).lockRotation = locked;
      (layer.fabricObject as any).lockScalingX = locked;
      (layer.fabricObject as any).lockScalingY = locked;
      layer.fabricObject.selectable = !locked;
      toggleLock(id);
      fabricCanvas?.renderAll();
    }
  };

  const handleDeleteLayer = (id: string) => {
    const layer = layers.find(l => l.id === id);
    if (layer && fabricCanvas) {
      fabricCanvas.remove(layer.fabricObject);
      removeLayer(id);
      saveState(JSON.stringify(fabricCanvas.toJSON()));
      toast.success("Camada removida");
    }
  };

  const handleDuplicateLayer = (id: string) => {
    if (fabricCanvas) {
      duplicateLayer(id, fabricCanvas);
      toast.success("Camada duplicada");
    }
  };

  const handleReorderLayers = (startIndex: number, endIndex: number) => {
    reorderLayers(startIndex, endIndex);
    
    // Atualizar z-index no canvas
    if (fabricCanvas) {
      const reorderedLayers = [...layers];
      const [removed] = reorderedLayers.splice(startIndex, 1);
      reorderedLayers.splice(endIndex, 0, removed);
      
      // Reordenar objetos no canvas
      reorderedLayers.forEach((layer) => {
        const currentIndex = fabricCanvas.getObjects().indexOf(layer.fabricObject);
        const targetIndex = layer.zIndex;
        
        if (currentIndex !== targetIndex) {
          fabricCanvas.remove(layer.fabricObject);
          fabricCanvas.insertAt(targetIndex, layer.fabricObject);
        }
      });
      
      fabricCanvas.renderAll();
    }
  };

  const handleExport = async () => {
    if (!fabricCanvas) return;

    const multiplier = dimensions.width / fabricCanvas.width!;
    const dataURL = fabricCanvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: multiplier,
      enableRetinaScaling: false,
    });

    const canvasJSON = fabricCanvas.toJSON();
    fabricCanvas.renderAll();
    
    console.log('📸 Canvas export:', {
      totalLayers: layers.length,
      objectsInJSON: canvasJSON.objects?.length || 0,
      canvasSize: `${fabricCanvas.width}x${fabricCanvas.height}`,
    });
    
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

  return (
    <div className="flex flex-col h-full">
      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Toolbar Vertical */}
        <CanvasToolbar
          onAddText={addText}
          onUploadImage={handleUploadImage}
          onAddRect={addRect}
          onAddCircle={addCircle}
          onAddTriangle={addTriangle}
          onAddStar={addStar}
          onAddLine={addLine}
          onCrop={handleCrop}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onDelete={handleDelete}
          canUndo={canUndo}
          canRedo={canRedo}
          hasSelection={!!selectedObject && !!selectedLayerId}
        />

        {/* Área do Canvas Central - MUITO MAIOR AGORA */}
        <div className="flex-1 p-4 overflow-auto bg-muted/20 flex items-center justify-center relative">
          {isLoadingCanvas ? (
            <div className="bg-white rounded-lg shadow-2xl border-2 border-border/50 p-4 animate-pulse">
              <div 
                className="bg-muted rounded flex items-center justify-center text-muted-foreground"
                style={{ 
                  width: dimensions.width * 0.5, 
                  height: dimensions.height * 0.5 
                }}
              >
                Carregando imagem...
              </div>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-lg shadow-2xl border-2 border-border/50 p-4">
                <canvas ref={canvasRef} />
              </div>

              <ZoomControls
                zoom={zoom}
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onZoomChange={handleZoomChange}
                onFitToScreen={handleFitToScreen}
              />
            </>
          )}
        </div>

        {/* Painel Lateral Único - Propriedades + Camadas Empilhados */}
        <div className="flex flex-col w-72 border-l bg-card">
          {/* Painel de Propriedades */}
          <div className="flex-1 overflow-auto max-h-[50vh] p-4 border-b">
            <div className="mb-4">
              <h3 className="text-sm font-semibold">Propriedades</h3>
              <Separator className="mt-2" />
            </div>
            <PropertiesPanel
              selectedObject={selectedObject}
              onPropertyChange={handlePropertyChange}
            />
          </div>

          {/* Painel de Camadas */}
          <div className="flex-1 overflow-auto">
            <div className="p-4 border-b">
              <h3 className="text-sm font-semibold">Camadas</h3>
            </div>
            <LayersPanel
              layers={layers}
              selectedLayerId={selectedLayerId}
              onSelectLayer={handleSelectLayer}
              onReorderLayers={handleReorderLayers}
              onToggleVisibility={handleToggleVisibility}
              onToggleLock={handleToggleLock}
              onDeleteLayer={handleDeleteLayer}
              onDuplicateLayer={handleDuplicateLayer}
            />
          </div>
        </div>
      </div>

      {/* Footer com ações */}
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
            <Button onClick={handleExport} className="bg-gradient-to-r from-primary to-primary/80">
              <Sparkles className="mr-2 h-4 w-4" />
              Finalizar e Salvar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
