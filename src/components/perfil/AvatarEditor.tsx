import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { ZoomIn, ZoomOut, Move, RotateCw, Check, X } from 'lucide-react';

interface AvatarEditorProps {
  imageUrl: string;
  onSave: (blob: Blob) => void;
  onCancel: () => void;
  open: boolean;
}

export default function AvatarEditor({ imageUrl, onSave, onCancel, open }: AvatarEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    if (imageUrl && open) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        setImage(img);
        // Calcular zoom inicial para caber a imagem inteira no círculo
        const canvasSize = 300;
        const imgAspect = img.width / img.height;
        let initialZoom: number;
        
        if (imgAspect > 1) {
          // Imagem horizontal - ajustar pela altura
          initialZoom = canvasSize / img.height;
        } else {
          // Imagem vertical ou quadrada - ajustar pela largura
          initialZoom = canvasSize / img.width;
        }
        
        // Centralizar imagem
        setPosition({ x: 0, y: 0 });
        setZoom(initialZoom);
        setRotation(0);
      };
      img.src = imageUrl;
    }
  }, [imageUrl, open]);

  useEffect(() => {
    if (image && canvasRef.current) {
      drawImage();
    }
  }, [image, zoom, position, rotation]);

  const drawImage = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || !image) return;

    const size = 300;
    canvas.width = size;
    canvas.height = size;

    // Limpar canvas
    ctx.clearRect(0, 0, size, size);

    // Salvar estado
    ctx.save();

    // Criar clip circular
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // Mover para o centro
    ctx.translate(size / 2, size / 2);

    // Aplicar rotação
    ctx.rotate((rotation * Math.PI) / 180);

    // Aplicar zoom e posição
    const scale = zoom;
    const imgWidth = image.width * scale;
    const imgHeight = image.height * scale;

    ctx.drawImage(
      image,
      -imgWidth / 2 + position.x,
      -imgHeight / 2 + position.y,
      imgWidth,
      imgHeight
    );

    // Restaurar estado
    ctx.restore();

    // Desenhar borda circular
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2 - 1, 0, Math.PI * 2);
    ctx.stroke();
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDragging(true);
    setDragStart({
      x: e.nativeEvent.offsetX - position.x,
      y: e.nativeEvent.offsetY - position.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging) return;
    setPosition({
      x: e.nativeEvent.offsetX - dragStart.x,
      y: e.nativeEvent.offsetY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomChange = (value: number[]) => {
    setZoom(value[0]);
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleSave = async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (blob) {
        onSave(blob);
      }
    }, 'image/png');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Foto de Perfil</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {/* Canvas de edição */}
          <div className="relative">
            <canvas
              ref={canvasRef}
              className="border-2 border-border rounded-full cursor-move"
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
            <div className="absolute top-2 right-2 bg-background/80 backdrop-blur-sm rounded-lg p-2 text-xs text-muted-foreground flex items-center gap-1">
              <Move className="h-3 w-3" />
              Arraste para posicionar
            </div>
          </div>

          {/* Controles de zoom */}
          <div className="w-full space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-1 text-muted-foreground">
                <ZoomOut className="h-4 w-4" />
                Zoom
                <ZoomIn className="h-4 w-4" />
              </span>
              <span className="font-medium">{Math.round(zoom * 100)}%</span>
            </div>
            <Slider
              value={[zoom]}
              onValueChange={handleZoomChange}
              min={0.1}
              max={3}
              step={0.05}
              className="w-full"
            />
          </div>

          {/* Botão de rotação */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRotate}
            className="w-full"
          >
            <RotateCw className="h-4 w-4 mr-2" />
            Girar 90° ({rotation}°)
          </Button>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            <Check className="h-4 w-4 mr-2" />
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
