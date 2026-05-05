import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Eye,
  ExternalLink,
  Download,
  Package,
  FileText,
  Image as ImageIcon,
  Copy,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import { toast } from "sonner";
import type { CalendarItem } from "@/hooks/useCalendars";
import { cn } from "@/lib/utils";

interface CarouselSlide {
  index: number;
  headline?: string;
  image_url?: string | null;
}

export function CalendarItemDoneView({ item }: { item: CalendarItem }) {
  const navigate = useNavigate();
  const meta = (item.metadata || {}) as Record<string, any>;
  const isCarousel = meta?.format === "carrossel";
  const carousel = (meta?.carousel || {}) as { slides?: CarouselSlide[] };
  const slides: CarouselSlide[] = carousel.slides || [];

  const [viewing, setViewing] = useState(false);
  const [lightbox, setLightbox] = useState<string | null>(null);

  const downloadImage = async (url: string, name: string) => {
    try {
      const res = await fetch(url, { mode: "cors" });
      const blob = await res.blob();
      const ext = blob.type.includes("png") ? "png" : blob.type.includes("webp") ? "webp" : "jpg";
      saveAs(blob, `${name}.${ext}`);
    } catch {
      toast.error("Falha ao baixar");
    }
  };

  const downloadAllSlides = async () => {
    const ready = slides.filter((s) => !!s.image_url);
    if (ready.length === 0) return;
    try {
      const zip = new JSZip();
      await Promise.all(
        ready.map(async (s) => {
          try {
            const res = await fetch(s.image_url!, { mode: "cors" });
            const blob = await res.blob();
            const ext = blob.type.includes("png") ? "png" : blob.type.includes("webp") ? "webp" : "jpg";
            zip.file(`slide-${String(s.index).padStart(2, "0")}.${ext}`, blob);
          } catch {}
        }),
      );
      const out = await zip.generateAsync({ type: "blob" });
      saveAs(out, `${(item.title || "carrossel").replace(/\s+/g, "-").toLowerCase()}.zip`);
      toast.success("Carrossel baixado");
    } catch {
      toast.error("Falha ao gerar zip");
    }
  };

  const copyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copiado`);
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  if (!viewing) {
    return (
      <div className="text-center py-10">
        <div className="mx-auto h-14 w-14 rounded-full bg-success/15 text-success flex items-center justify-center mb-3">
          <CheckCircle2 className="h-7 w-7" />
        </div>
        <h3 className="font-semibold text-base">Pauta concluída</h3>
        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
          Todo o conteúdo desta pauta foi gerado e aprovado. Visualize abaixo ou abra
          a criação completa.
        </p>
        <div className="mt-5 flex items-center justify-center gap-2 flex-wrap">
          <Button onClick={() => setViewing(true)} className="gap-2">
            <Eye className="h-4 w-4" /> Visualizar conteúdo
          </Button>
          {isCarousel && slides.some((s) => s.image_url) && (
            <Button variant="outline" onClick={downloadAllSlides} className="gap-2">
              <Package className="h-4 w-4" /> Baixar carrossel (.zip)
            </Button>
          )}
          {!isCarousel && item.design_action_id && (
            <Button
              variant="outline"
              onClick={() => navigate(`/action/${item.design_action_id}`)}
              className="gap-2"
            >
              <ExternalLink className="h-4 w-4" /> Abrir criação
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-semibold text-base">Conteúdo da pauta</h3>
          <p className="text-xs text-muted-foreground">Todos os textos e imagens gerados.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isCarousel && slides.some((s) => s.image_url) && (
            <Button variant="outline" size="sm" onClick={downloadAllSlides} className="gap-2">
              <Package className="h-3.5 w-3.5" /> Baixar tudo (.zip)
            </Button>
          )}
          {!isCarousel && item.design_action_id && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/action/${item.design_action_id}`)}
              className="gap-2"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Abrir criação completa
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setViewing(false)}>
            Fechar
          </Button>
        </div>
      </div>

      {/* Texto / legenda */}
      {item.text_briefing && (
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-3 w-3" /> Texto / Legenda
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={() => copyText(item.text_briefing || "", "Texto")}
            >
              <Copy className="h-3 w-3" /> Copiar
            </Button>
          </div>
          <p className="text-sm whitespace-pre-wrap text-foreground/90 leading-relaxed">
            {item.text_briefing}
          </p>
        </section>
      )}

      {/* Briefing visual */}
      {item.image_briefing && (
        <section className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5">
              <ImageIcon className="h-3 w-3" /> Briefing visual
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1.5 text-xs"
              onClick={() => copyText(item.image_briefing || "", "Briefing")}
            >
              <Copy className="h-3 w-3" /> Copiar
            </Button>
          </div>
          <p className="text-sm whitespace-pre-wrap text-foreground/90 leading-relaxed">
            {item.image_briefing}
          </p>
        </section>
      )}

      {/* Imagens — carrossel */}
      {isCarousel && slides.length > 0 && (
        <section className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-3 flex items-center gap-1.5">
            <ImageIcon className="h-3 w-3" /> Slides do carrossel · {slides.length}
          </p>
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
                  <img
                    src={s.image_url}
                    alt={`Slide ${s.index}`}
                    className="w-full h-full object-cover cursor-zoom-in"
                    onClick={() => setLightbox(s.image_url!)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                    sem imagem
                  </div>
                )}
                {s.image_url && (
                  <button
                    type="button"
                    onClick={() => downloadImage(s.image_url!, `slide-${String(s.index).padStart(2, "0")}`)}
                    title="Baixar"
                    className="absolute bottom-2 right-2 z-10 bg-background/90 backdrop-blur rounded-md p-1.5 hover:bg-background transition opacity-0 group-hover:opacity-100"
                  >
                    <Download className="h-3.5 w-3.5" />
                  </button>
                )}
                {s.headline && (
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent text-white text-[10px] font-medium line-clamp-2 pointer-events-none">
                    {s.headline}
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            className="absolute top-4 right-4 text-white/80 hover:text-white"
            onClick={() => setLightbox(null)}
          >
            <X className="h-6 w-6" />
          </button>
          <img
            src={lightbox}
            alt="Visualização"
            className={cn("max-h-full max-w-full rounded-lg shadow-2xl")}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
