import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Sparkles, CheckCircle2, AlertCircle, ImageIcon, RefreshCw, Download, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUpdateCalendarItem, type CalendarItem } from "@/hooks/useCalendars";
import { AgentFeedback } from "@/components/AgentFeedback";
import { saveAs } from "file-saver";
import JSZip from "jszip";

interface Slide {
  index: number;
  role: string;
  headline: string;
  image_url?: string | null;
  status?: "pending" | "generating" | "done" | "error";
  error?: string | null;
}

export function CarouselDesignStage({
  item,
  update,
}: {
  item: CalendarItem;
  update: ReturnType<typeof useUpdateCalendarItem>;
}) {
  const meta = (item.metadata || {}) as Record<string, any>;
  const carousel = (meta.carousel || {}) as { slides?: Slide[]; generation?: any };
  const slides = carousel.slides || [];
  const gen = carousel.generation || {};
  const isRunning = gen.status === "pending";
  const qc = useQueryClient();

  useEffect(() => {
    if (!isRunning && !slides.some((s) => s.status === "generating")) return;
    const t = setInterval(() => {
      qc.invalidateQueries({ queryKey: ["calendar-items", item.calendar_id] });
    }, 4000);
    return () => clearInterval(t);
  }, [isRunning, slides, qc, item.calendar_id]);

  const allDone = slides.length > 0 && slides.every((s) => s.status === "done" && s.image_url);
  const anyError = slides.some((s) => s.status === "error");

  const trigger = async (regenerate = false, slideIndices?: number[]) => {
    try {
      const { error } = await supabase.functions.invoke("generate-carousel-images", {
        body: { item_id: item.id, regenerate, slide_indices: slideIndices },
      });
      if (error) throw error;
      toast.info(slideIndices ? "Regerando slide…" : "Gerando imagens do carrossel…");
      qc.invalidateQueries({ queryKey: ["calendar-items", item.calendar_id] });
    } catch (e: any) {
      toast.error(e?.message || "Falha ao gerar");
    }
  };

  const downloadOne = async (s: Slide) => {
    if (!s.image_url) return;
    try {
      const res = await fetch(s.image_url, { mode: "cors" });
      const blob = await res.blob();
      const ext = blob.type.includes("png") ? "png" : blob.type.includes("webp") ? "webp" : "jpg";
      saveAs(blob, `slide-${String(s.index).padStart(2, "0")}.${ext}`);
    } catch (e: any) {
      toast.error("Falha ao baixar imagem");
    }
  };

  const downloadAll = async () => {
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
      saveAs(out, `carrossel-${item.id.slice(0, 8)}.zip`);
      toast.success("Carrossel baixado");
    } catch (e: any) {
      toast.error("Falha ao gerar zip");
    }
  };

  const approve = () => {
    update.mutate({
      id: item.id,
      updates: {
        design_approved: true,
        final_approved: true,
        stage: "done",
      },
    });
  };

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/8 to-card p-4 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            Geração de imagens · {slides.length} slides
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            A capa é gerada primeiro e usada como referência visual para os demais.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {allDone && (
            <Button onClick={downloadAll} variant="outline" size="lg" className="gap-2">
              <Package className="h-4 w-4" />
              Baixar todas (.zip)
            </Button>
          )}
          <Button onClick={() => trigger(false)} disabled={isRunning} size="lg" className="gap-2">
            {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {isRunning ? "Gerando…" : allDone ? "Regerar pendentes" : "Gerar todas as imagens"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {slides.map((s) => (
          <div
            key={s.index}
            className={cn(
              "relative rounded-xl border-2 overflow-hidden bg-muted/30 aspect-[4/5] flex flex-col",
              s.status === "done" && "border-success/30",
              s.status === "error" && "border-destructive/40",
              s.status === "generating" && "border-primary/40 animate-pulse",
            )}
          >
            <div className="absolute top-2 left-2 z-10 text-[10px] font-bold bg-background/90 backdrop-blur px-1.5 py-0.5 rounded">
              {s.index}
            </div>
            {s.image_url ? (
              <img src={s.image_url} alt={`Slide ${s.index}`} className="w-full h-full object-cover" />
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground">
                {s.status === "generating" ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : s.status === "error" ? (
                  <AlertCircle className="h-6 w-6 text-destructive" />
                ) : (
                  <ImageIcon className="h-6 w-6 opacity-40" />
                )}
              </div>
            )}
            {s.status === "done" && (
              <button
                type="button"
                onClick={() => trigger(true, [s.index])}
                className="absolute bottom-2 right-2 z-10 bg-background/90 backdrop-blur rounded-md p-1.5 hover:bg-background transition"
                title="Regerar"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            )}
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent text-white text-[10px] font-medium line-clamp-2">
              {s.headline}
            </div>
          </div>
        ))}
      </div>

      {anyError && (
        <div className="text-xs text-destructive bg-destructive/5 border border-destructive/20 rounded-lg p-3">
          Alguns slides falharam. Use o botão de regerar individual em cada um.
        </div>
      )}

      <div
        className={cn(
          "rounded-2xl border p-4 flex items-center justify-between gap-3 flex-wrap",
          allDone ? "border-success/30 bg-success/5" : "border-border bg-muted/30",
        )}
      >
        <p className="text-sm">
          {allDone
            ? "Todas as imagens prontas. Avance para revisão final."
            : `${slides.filter((s) => s.status === "done").length} de ${slides.length} prontas.`}
        </p>
        <Button size="lg" onClick={approve} disabled={!allDone || update.isPending} className="gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Aprovar imagens
        </Button>
      </div>

      <AgentFeedback
        agentId="image_generation"
        targetType="calendar_item_design"
        targetId={item.id}
        brandId={(item as any).brand_id || null}
        contentSnapshot={{ carousel: { slides: slides.map((s) => ({ index: s.index, image_url: s.image_url })) } }}
        label="estas imagens do carrossel"
      />
    </div>
  );
}
