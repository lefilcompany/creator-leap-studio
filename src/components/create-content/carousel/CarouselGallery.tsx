import { memo, useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { Loader2, RefreshCw, AlertCircle, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CreationFeedback } from "@/components/CreationFeedback";
import { RegenerateImageDialog } from "@/components/create-content/regenerate/RegenerateImageDialog";
import type { CarouselResult, SlideState } from "./types";

interface Props {
  actionId: string;
  carousel: CarouselResult;
  onRegenerate?: (index: number) => void;
}

function StatusOverlay({
  slide,
  onRegenerate,
}: {
  slide: SlideState;
  onRegenerate?: () => void;
}) {
  if (slide.status === "done") return null;
  if (slide.status === "error") {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/10 backdrop-blur-sm rounded-2xl gap-3 p-4 text-center">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-sm font-medium text-destructive">Falha ao gerar este slide</p>
        {slide.error && (
          <p className="text-xs text-muted-foreground line-clamp-2 max-w-xs">{slide.error}</p>
        )}
        {onRegenerate && (
          <Button
            type="button"
            size="sm"
            onClick={onRegenerate}
            className="mt-1 gap-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Regerar slide
          </Button>
        )}
      </div>
    );
  }
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/60 backdrop-blur-sm rounded-2xl gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm font-medium text-muted-foreground">
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

function CarouselGalleryBase({ actionId, carousel, onRegenerate }: Props) {
  const slides = carousel?.slides ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: tipar adequadamente
  const brandId = (carousel as any).brandId as string | undefined;

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: "center" });
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  const [regenSlide, setRegenSlide] = useState<SlideState | null>(null);

  const openRegenerate = (slide: SlideState) => {
    if (onRegenerate) {
      onRegenerate(slide.index);
      return;
    }
    setRegenSlide(slide);
  };

  const currentSlide = slides[selectedIndex];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-bold">
          Slide {selectedIndex + 1} de {slides.length}
        </h3>
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-8 w-8 rounded-full"
            onClick={() => emblaApi?.scrollPrev()}
            disabled={selectedIndex === 0}
            aria-label="Slide anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-8 w-8 rounded-full"
            onClick={() => emblaApi?.scrollNext()}
            disabled={selectedIndex >= slides.length - 1}
            aria-label="Próximo slide"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl" ref={emblaRef}>
        <div className="flex">
          {slides.map((slide) => (
            <div key={slide.index} className="min-w-0 flex-[0_0_100%]">
              <div className="relative aspect-[4/5] bg-muted/40 rounded-2xl overflow-hidden border border-border/40">
                {slide.imageUrl && slide.status === "done" ? (
                  <img
                    src={slide.imageUrl}
                    alt={`Slide ${slide.index + 1}`}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : null}
                <StatusOverlay slide={slide} onRegenerate={() => openRegenerate(slide)} />
                <div className="absolute top-3 left-3 rounded-full bg-background/85 backdrop-blur px-2.5 py-1 text-xs font-bold">
                  {slide.index + 1}/{slides.length}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Dots */}
      <div className="flex items-center justify-center gap-1.5">
        {slides.map((s, i) => (
          <button
            key={s.index}
            type="button"
            onClick={() => emblaApi?.scrollTo(i)}
            aria-label={`Ir para slide ${i + 1}`}
            className={cn(
              "h-2 rounded-full transition-all",
              i === selectedIndex ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50"
            )}
          />
        ))}
      </div>

      {/* Ações do slide atual */}
      {currentSlide && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-9 gap-1.5"
              onClick={() => openRegenerate(currentSlide)}
              disabled={currentSlide.status === "generating" || currentSlide.status === "pending"}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", currentSlide.status === "generating" && "animate-spin")} />
              Regerar este slide
            </Button>
            {currentSlide.imageUrl && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-9 gap-1.5"
                onClick={() => downloadImage(currentSlide.imageUrl!, `slide-${currentSlide.index + 1}.png`)}
              >
                <Download className="h-3.5 w-3.5" />
                Baixar
              </Button>
            )}
          </div>

          {currentSlide.status === "done" && currentSlide.childActionId && (
            <CreationFeedback
              actionId={currentSlide.childActionId}
              brandId={brandId}
              imageUrl={currentSlide.imageUrl}
            />
          )}
        </div>
      )}

      <RegenerateImageDialog
        open={!!regenSlide}
        onOpenChange={(o) => { if (!o) setRegenSlide(null); }}
        actionId={actionId}
        carousel={carousel}
        slide={regenSlide}
      />
    </div>
  );
}

/**
 * Memoiza a galeria: só re-renderiza quando algo relevante muda
 * (status/imageUrl/error de algum slide ou actionId). Evita o re-init
 * do Embla a cada poll, que causava o flicker percebido na coluna de texto.
 */
export const CarouselGallery = memo(CarouselGalleryBase, (prev, next) => {
  if (prev.actionId !== next.actionId) return false;
  if (prev.onRegenerate !== next.onRegenerate) return false;
  const a = prev.carousel?.slides ?? [];
  const b = next.carousel?.slides ?? [];
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (
      a[i]?.status !== b[i]?.status ||
      a[i]?.imageUrl !== b[i]?.imageUrl ||
      a[i]?.error !== b[i]?.error ||
      a[i]?.childActionId !== b[i]?.childActionId
    ) {
      return false;
    }
  }
  return true;
});
