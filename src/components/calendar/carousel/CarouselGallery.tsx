import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Package } from "lucide-react";
import { toast } from "sonner";
import { saveAs } from "file-saver";
import JSZip from "jszip";

export interface CarouselSlide {
  index: number;
  headline?: string;
  image_url?: string | null;
}

async function fetchAsBlob(url: string): Promise<Blob> {
  const res = await fetch(url, { mode: "cors" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.blob();
}

function extFromBlob(blob: Blob): string {
  const t = blob.type.toLowerCase();
  if (t.includes("png")) return "png";
  if (t.includes("webp")) return "webp";
  if (t.includes("jpeg") || t.includes("jpg")) return "jpg";
  return "jpg";
}

export function CarouselGallery({
  slides,
  baseName = "carrossel",
  className,
}: {
  slides: CarouselSlide[];
  baseName?: string;
  className?: string;
}) {
  const [downloadingIdx, setDownloadingIdx] = useState<number | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);

  const downloadOne = async (s: CarouselSlide) => {
    if (!s.image_url) return;
    try {
      setDownloadingIdx(s.index);
      const blob = await fetchAsBlob(s.image_url);
      saveAs(blob, `${baseName}-slide-${String(s.index).padStart(2, "0")}.${extFromBlob(blob)}`);
    } catch (e: any) {
      toast.error(e?.message || "Falha ao baixar imagem");
    } finally {
      setDownloadingIdx(null);
    }
  };

  const downloadAll = async () => {
    const ready = slides.filter((s) => !!s.image_url);
    if (ready.length === 0) return;
    try {
      setDownloadingAll(true);
      const zip = new JSZip();
      await Promise.all(
        ready.map(async (s) => {
          try {
            const blob = await fetchAsBlob(s.image_url!);
            zip.file(`${baseName}-slide-${String(s.index).padStart(2, "0")}.${extFromBlob(blob)}`, blob);
          } catch (e) {
            console.error("zip slide", s.index, e);
          }
        }),
      );
      const out = await zip.generateAsync({ type: "blob" });
      saveAs(out, `${baseName}.zip`);
      toast.success("Carrossel baixado");
    } catch (e: any) {
      toast.error(e?.message || "Falha ao baixar carrossel");
    } finally {
      setDownloadingAll(false);
    }
  };

  const readyCount = slides.filter((s) => !!s.image_url).length;

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <p className="text-xs text-muted-foreground">
          {readyCount} de {slides.length} imagens prontas
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={downloadAll}
          disabled={downloadingAll || readyCount === 0}
          className="gap-2"
        >
          {downloadingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Package className="h-3.5 w-3.5" />}
          Baixar todas (.zip)
        </Button>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {slides.map((s) => (
          <div
            key={s.index}
            className="relative rounded-xl overflow-hidden bg-muted/30 aspect-[4/5] border border-border/40 group"
          >
            <div className="absolute top-2 left-2 z-10 text-[10px] font-bold bg-background/90 backdrop-blur px-1.5 py-0.5 rounded">
              {s.index}
            </div>
            {s.image_url ? (
              <img src={s.image_url} alt={`Slide ${s.index}`} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                sem imagem
              </div>
            )}
            {s.image_url && (
              <button
                type="button"
                onClick={() => downloadOne(s)}
                disabled={downloadingIdx === s.index}
                title="Baixar imagem"
                className="absolute bottom-2 right-2 z-10 bg-background/90 backdrop-blur rounded-md p-1.5 hover:bg-background transition opacity-0 group-hover:opacity-100"
              >
                {downloadingIdx === s.index ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5" />
                )}
              </button>
            )}
            {s.headline && (
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent text-white text-[10px] font-medium line-clamp-2">
                {s.headline}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
