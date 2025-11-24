import { AspectRatio } from "@/components/ui/aspect-ratio";
import { ASPECT_RATIO_DIMENSIONS } from "@/lib/platformSpecs";

interface AspectRatioPreviewProps {
  aspectRatio: string;
}

export const AspectRatioPreview = ({ aspectRatio }: AspectRatioPreviewProps) => {
  const ratioData = ASPECT_RATIO_DIMENSIONS[aspectRatio as keyof typeof ASPECT_RATIO_DIMENSIONS];
  
  if (!ratioData) return null;

  const ratio = ratioData.width / ratioData.height;

  return (
    <div className="space-y-2 p-4 rounded-lg border border-border bg-muted/30">
      <p className="text-sm font-medium text-foreground">Preview da Proporção</p>
      <div className="flex items-center gap-4">
        <div className="w-32">
          <AspectRatio ratio={ratio}>
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 rounded border-2 border-primary/30 flex items-center justify-center">
              <span className="text-xs font-medium text-primary">{aspectRatio}</span>
            </div>
          </AspectRatio>
        </div>
        <div className="flex-1 space-y-1">
          <p className="text-sm font-medium text-foreground">{ratioData.label}</p>
          <p className="text-xs text-muted-foreground">
            {ratioData.width} × {ratioData.height} pixels
          </p>
        </div>
      </div>
    </div>
  );
};
