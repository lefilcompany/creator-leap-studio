import { Button } from "@/components/ui/button";
import { ZoomIn, ZoomOut, Maximize } from "lucide-react";
import { Slider } from "@/components/ui/slider";

interface ZoomControlsProps {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomChange: (value: number) => void;
  onFitToScreen: () => void;
}

export const ZoomControls = ({
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomChange,
  onFitToScreen
}: ZoomControlsProps) => {
  return (
    <div className="absolute bottom-4 right-4 bg-card border border-border rounded-lg shadow-lg p-3 flex items-center gap-3">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={onZoomOut}
        disabled={zoom <= 0.25}
        title="Diminuir Zoom"
      >
        <ZoomOut className="h-4 w-4" />
      </Button>

      <div className="flex items-center gap-2 min-w-[120px]">
        <Slider
          value={[zoom * 100]}
          onValueChange={([value]) => onZoomChange(value / 100)}
          min={25}
          max={200}
          step={5}
          className="flex-1"
        />
        <span className="text-xs font-medium min-w-[45px]">
          {Math.round(zoom * 100)}%
        </span>
      </div>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={onZoomIn}
        disabled={zoom >= 2}
        title="Aumentar Zoom"
      >
        <ZoomIn className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8"
        onClick={onFitToScreen}
        title="Ajustar à Tela"
      >
        <Maximize className="h-4 w-4" />
      </Button>
    </div>
  );
};
