import { Loader2, RefreshCw, AlertCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { CarouselResult, SlideState } from "./types";

interface Props {
  actionId: string;
  carousel: CarouselResult;
  onRegenerate?: (index: number) => void;
}

function StatusOverlay({ slide }: { slide: SlideState }) {
  if (slide.status === "done") return null;
  if (slide.status === "error") {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/10 backdrop-blur-sm rounded-2xl gap-1 p-3 text-center">
        <AlertCircle className="h-6 w-6 text-destructive" />
        <p className="text-xs font-medium text-destructive">Falha ao gerar</p>
        {slide.error && (
          <p className="text-[10px] text-muted-foreground line-clamp-2">{slide.error}</p>
        )}
      </div>
    );
  }
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/60 backdrop-blur-sm rounded-2xl gap-2">
      <Loader2 className="h-6 w-6 animate-spin text-primary" />
      <p className="text-xs font-medium text-muted-foreground">
        {slide.status === "generating" ? "Gerando..." : "Aguardando..."}
      </p>
    </div>
  );
}

async function downloadImage(url: string, filename: string) {
  try {
    const r = await fetch(url);
    const blob = await r.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    toast.error("Não foi possível baixar a imagem");
  }
}

export function CarouselGallery({ actionId, carousel, onRegenerate }: Props) {
  const handleRegenerate = async (slide: SlideState) => {
    if (onRegenerate) {
      onRegenerate(slide.index);
      return;
    }
    // Default: chama generate-carousel-images com onlyIndex
    const body = {
      actionId,
      slidesCount: carousel.slidesCount,
      slides: carousel.slides.map((s) => ({
        index: s.index,
        prompt: s.prompt,
        visualStyle: s.visualStyle,
        cameraAngle: s.cameraAngle,
        lighting: s.lighting,
        composition: s.composition,
        mood: s.mood,
        referenceImageUrl: s.referenceImageUrl,
      })),
      brandId: (carousel as any).brandId,
      themeId: (carousel as any).themeId,
      personaId: (carousel as any).personaId,
      platform: "Carrossel",
      contentType: (carousel as any).contentType ?? "organic",
      onlyIndex: slide.index,
    };
    const { error } = await supabase.functions.invoke("generate-carousel-images", { body });
    if (error) toast.error("Erro ao regerar slide", { description: error.message });
    else toast.success(`Slide ${slide.index + 1} entrou na fila`);
  };

  const slides = carousel?.slides ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold">Carrossel ({slides.length} slides)</h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {slides.map((slide) => (
          <div key={slide.index} className="rounded-2xl bg-card shadow-md border border-border/40 overflow-hidden">
            <div className="relative aspect-[4/5] bg-muted/40">
              {slide.imageUrl && slide.status === "done" ? (
                <img
                  src={slide.imageUrl}
                  alt={`Slide ${slide.index + 1}`}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : null}
              <StatusOverlay slide={slide} />
              <div className="absolute top-2 left-2 rounded-full bg-background/80 backdrop-blur px-2 py-0.5 text-[10px] font-bold">
                {slide.index + 1}
              </div>
            </div>
            <div className="p-2.5 space-y-2">
              <p className="text-xs text-muted-foreground line-clamp-2">{slide.prompt}</p>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 flex-1 text-xs"
                  onClick={() => handleRegenerate(slide)}
                  disabled={slide.status === "generating" || slide.status === "pending"}
                >
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Regerar
                </Button>
                {slide.imageUrl && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2"
                    onClick={() => downloadImage(slide.imageUrl!, `slide-${slide.index + 1}.png`)}
                  >
                    <Download className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
