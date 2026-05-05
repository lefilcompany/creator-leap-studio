import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Sparkles, CheckCircle2, AlertCircle, ImageIcon, RefreshCw, Download, Package, Type, Settings2, ChevronRight } from "lucide-react";
import { TextOverlayEditor, type TextLayer } from "@/components/TextOverlayEditor";
import { SlideImageSettingsForm, type SlideImageSettings } from "./SlideImageSettingsForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useUpdateCalendarItem, type CalendarItem } from "@/hooks/useCalendars";
import { AgentFeedback } from "@/components/AgentFeedback";
import { saveAs } from "file-saver";
import JSZip from "jszip";

interface Slide {
  index: number;
  role: string;
  headline: string;
  caption_part?: string;
  image_briefing?: string;
  image_settings?: SlideImageSettings;
  image_url?: string | null;
  status?: "pending" | "generating" | "done" | "error";
  error?: string | null;
}

const hasMinimumSettings = (s?: SlideImageSettings) => {
  if (!s) return false;
  // Exige ao menos estilo visual + ângulo OU ter sido tocado (qualquer campo principal)
  return !!(s.visualStyle && s.cameraAngle);
};

export function CarouselDesignStage({
  item,
  update,
}: {
  item: CalendarItem;
  update: ReturnType<typeof useUpdateCalendarItem>;
}) {
  const meta = (item.metadata || {}) as Record<string, any>;
  const carousel = (meta.carousel || {}) as { slides?: Slide[]; generation?: any; shared_style?: any; images_approved?: boolean };
  const slides = carousel.slides || [];
  const gen = carousel.generation || {};
  const isRunning = gen.status === "pending";
  const qc = useQueryClient();
  const [editing, setEditing] = useState<{ index: number; sequential: boolean } | null>(null);
  const [settingsFor, setSettingsFor] = useState<number | null>(null);
  const layersByIndex = (meta.carousel?.text_layers || {}) as Record<string, TextLayer[]>;

  const updateSlideSettings = async (index: number, settings: SlideImageSettings) => {
    const nextSlides = slides.map((s) => (s.index === index ? { ...s, image_settings: settings } : s));
    await update.mutateAsync({
      id: item.id,
      updates: { metadata: { ...meta, carousel: { ...carousel, slides: nextSlides } } },
    });
  };

  const saveSlideImage = async (index: number, newUrl: string, layers: TextLayer[]) => {
    const nextSlides = slides.map((s) => (s.index === index ? { ...s, image_url: newUrl } : s));
    const nextLayers = { ...layersByIndex, [String(index)]: layers };
    await update.mutateAsync({
      id: item.id,
      updates: {
        metadata: {
          ...meta,
          carousel: { ...carousel, slides: nextSlides, text_layers: nextLayers },
        },
      },
    });
  };

  const handleSaved = async (newUrl: string, layers: TextLayer[]) => {
    if (!editing) return;
    await saveSlideImage(editing.index, newUrl, layers);
    if (editing.sequential) {
      const next = slides.find((s) => s.index > editing.index && s.image_url);
      if (next) {
        setEditing({ index: next.index, sequential: true });
        return;
      }
      toast.success("Você editou todos os slides!");
    }
    setEditing(null);
  };


  useEffect(() => {
    if (!isRunning && !slides.some((s) => s.status === "generating")) return;
    const t = setInterval(() => {
      qc.invalidateQueries({ queryKey: ["calendar-items", item.calendar_id] });
    }, 4000);
    return () => clearInterval(t);
  }, [isRunning, slides, qc, item.calendar_id]);

  const allDone = slides.length > 0 && slides.every((s) => s.status === "done" && s.image_url);
  const anyError = slides.some((s) => s.status === "error");
  const imagesApproved = !!carousel.images_approved;

  const trigger = async (regenerate = false, slideIndices?: number[]) => {
    try {
      const { error } = await supabase.functions.invoke("generate-carousel-images", {
        body: { item_id: item.id, regenerate, slide_indices: slideIndices },
      });
      if (error) throw error;
      toast.info(slideIndices && slideIndices.length === 1 ? "Gerando slide…" : "Gerando imagens…");
      qc.invalidateQueries({ queryKey: ["calendar-items", item.calendar_id] });
    } catch (e: any) {
      toast.error(e?.message || "Falha ao gerar");
    }
  };

  const requestGenerate = (s: Slide, regenerate = false) => {
    if (!hasMinimumSettings(s.image_settings)) {
      toast.info("Configure a imagem deste slide antes de gerar");
      setSettingsFor(s.index);
      return;
    }
    trigger(regenerate, [s.index]);
  };

  // Propaga configuração de um slide (template) para os demais que ainda não têm config própria
  const generateRestWithTemplate = async (templateIndex: number) => {
    const template = slides.find((s) => s.index === templateIndex);
    if (!template?.image_settings) {
      toast.error("Configure as imagens do slide modelo primeiro");
      return;
    }
    const targets = slides.filter((s) => s.index !== templateIndex && s.status !== "done");
    if (targets.length === 0) {
      toast.info("Nenhum slide pendente");
      return;
    }
    const nextSlides = slides.map((s) => {
      if (s.index === templateIndex) return s;
      if (s.status === "done") return s;
      if (!s.image_settings || !hasMinimumSettings(s.image_settings)) {
        return { ...s, image_settings: { ...template.image_settings } };
      }
      return s;
    });
    await update.mutateAsync({
      id: item.id,
      updates: { metadata: { ...meta, carousel: { ...carousel, slides: nextSlides } } },
    });
    await trigger(false, targets.map((s) => s.index));
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

  const approveImages = async () => {
    await update.mutateAsync({
      id: item.id,
      updates: {
        metadata: {
          ...meta,
          carousel: { ...carousel, images_approved: true },
        },
      },
    });
    toast.success("Imagens aprovadas — agora insira os textos");
  };

  const finalize = () => {
    update.mutate({
      id: item.id,
      updates: {
        design_approved: true,
        final_approved: true,
        stage: "done",
      },
    });
  };

  // ============ ETAPA 2: Inserção de textos (pós-aprovação) ============
  if (imagesApproved) {
    const slidesWithText = slides.filter((s) => layersByIndex[String(s.index)]?.length);
    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 to-card p-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Type className="h-4 w-4" />
            Inserir textos nos slides
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            As imagens estão aprovadas. Agora adicione textos sobre cada slide. Você pode editar em sequência ou individualmente.
          </p>
          <div className="flex flex-wrap gap-2 mt-3">
            <Button
              size="lg"
              onClick={() => {
                const first = slides.find((s) => s.image_url);
                if (first) setEditing({ index: first.index, sequential: true });
              }}
              className="gap-2"
            >
              <Type className="h-4 w-4" />
              Editar textos em sequência
            </Button>
            <Button onClick={downloadAll} variant="outline" size="lg" className="gap-2">
              <Package className="h-4 w-4" />
              Baixar todas (.zip)
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {slides.map((s) => {
            const hasLayers = !!layersByIndex[String(s.index)]?.length;
            return (
              <div
                key={s.index}
                className="relative rounded-xl border-2 overflow-hidden bg-muted/30 aspect-[4/5] cursor-pointer group"
                onClick={() => setEditing({ index: s.index, sequential: false })}
              >
                <div className="absolute top-2 left-2 z-10 text-[10px] font-bold bg-background/90 backdrop-blur px-1.5 py-0.5 rounded">
                  {s.index}
                </div>
                {hasLayers && (
                  <div className="absolute top-2 right-2 z-10 text-[10px] font-bold bg-success text-success-foreground px-1.5 py-0.5 rounded inline-flex items-center gap-1">
                    <CheckCircle2 className="h-2.5 w-2.5" /> Texto
                  </div>
                )}
                {s.image_url && (
                  <img src={s.image_url} alt={`Slide ${s.index}`} className="w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition text-white text-xs font-semibold inline-flex items-center gap-1">
                    <Type className="h-3.5 w-3.5" /> Editar texto
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl border border-success/30 bg-success/5 p-4 flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm">
            {slidesWithText.length} de {slides.length} slides com texto adicionado.
          </p>
          <Button size="lg" onClick={finalize} disabled={update.isPending} className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Finalizar carrossel
          </Button>
        </div>

        {editing && (() => {
          const slide = slides.find((s) => s.index === editing.index);
          if (!slide?.image_url) return null;
          return (
            <TextOverlayEditor
              open
              onOpenChange={(o) => { if (!o) setEditing(null); }}
              imageUrl={slide.image_url}
              initialLayers={layersByIndex[String(editing.index)]}
              onSaved={handleSaved}
            />
          );
        })()}
      </div>
    );
  }

  // ============ ETAPA 1: Configurar e gerar imagens ============
  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/8 to-card p-4">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <ImageIcon className="h-4 w-4" />
          Geração de imagens · {slides.length} slides
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          <strong>Configure cada slide antes de gerar.</strong> A capa é gerada primeiro e usada como referência visual para os demais. Os textos serão inseridos depois, na próxima etapa.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {slides.map((s) => {
          const hasSettings = hasMinimumSettings(s.image_settings);
          return (
          <div
            key={s.index}
            className={cn(
              "relative rounded-xl border-2 overflow-hidden bg-muted/30 aspect-[4/5] flex flex-col",
              s.status === "done" && "border-success/30",
              s.status === "error" && "border-destructive/40",
              s.status === "generating" && "border-primary/40 animate-pulse",
              !s.image_url && !hasSettings && "border-amber-400/60 ring-2 ring-amber-400/20",
            )}
          >
            <div className="absolute top-2 left-2 z-10 text-[10px] font-bold bg-background/90 backdrop-blur px-1.5 py-0.5 rounded">
              {s.index}
            </div>
            {/* Botão de configuração — destacado */}
            <button
              type="button"
              onClick={() => setSettingsFor(s.index)}
              className={cn(
                "absolute top-2 right-2 z-10 rounded-md px-2 py-1 text-[10px] font-semibold inline-flex items-center gap-1 shadow-md transition",
                hasSettings
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-amber-500 text-white hover:bg-amber-600 animate-pulse",
              )}
              title="Configurações da imagem"
            >
              <Settings2 className="h-3 w-3" />
              {hasSettings ? "Config" : "Configurar"}
            </button>
            {s.image_url ? (
              <img src={s.image_url} alt={`Slide ${s.index}`} className="w-full h-full object-cover" />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 text-muted-foreground p-2 text-center">
                {s.status === "generating" ? (
                  <Loader2 className="h-6 w-6 animate-spin" />
                ) : s.status === "error" ? (
                  <>
                    <AlertCircle className="h-6 w-6 text-destructive" />
                    <Button size="sm" variant="outline" onClick={() => requestGenerate(s, true)} className="gap-1 h-7 text-xs">
                      <RefreshCw className="h-3 w-3" /> Tentar novamente
                    </Button>
                  </>
                ) : !hasSettings ? (
                  <>
                    <Settings2 className="h-6 w-6 opacity-60 text-amber-600" />
                    <p className="text-[11px] font-medium text-amber-700 dark:text-amber-400">
                      Configure antes de gerar
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSettingsFor(s.index)}
                      className="gap-1 h-7 text-xs"
                    >
                      <Settings2 className="h-3 w-3" /> Configurar
                    </Button>
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-6 w-6 opacity-40" />
                    <Button
                      size="sm"
                      onClick={() => requestGenerate(s, false)}
                      disabled={isRunning}
                      className="gap-1 h-7 text-xs"
                    >
                      <Sparkles className="h-3 w-3" /> Gerar imagem
                    </Button>
                    <button
                      type="button"
                      onClick={() => generateRestWithTemplate(s.index)}
                      className="text-[10px] underline text-muted-foreground hover:text-foreground"
                    >
                      Usar config nos demais
                    </button>
                  </>
                )}
              </div>
            )}
            {s.status === "done" && (
              <div className="absolute bottom-2 right-2 z-10 flex gap-1">
                <button
                  type="button"
                  onClick={() => downloadOne(s)}
                  className="bg-background/90 backdrop-blur rounded-md p-1.5 hover:bg-background transition"
                  title="Baixar"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => requestGenerate(s, true)}
                  className="bg-background/90 backdrop-blur rounded-md p-1.5 hover:bg-background transition"
                  title="Regerar"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent text-white text-[10px] font-medium line-clamp-2">
              {s.headline}
            </div>
          </div>
          );
        })}
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
            ? "Todas as imagens prontas. Aprove para inserir os textos."
            : `${slides.filter((s) => s.status === "done").length} de ${slides.length} prontas.`}
        </p>
        <Button size="lg" onClick={approveImages} disabled={!allDone || update.isPending} className="gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Aprovar imagens
          <ChevronRight className="h-4 w-4" />
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

      {settingsFor !== null && (() => {
        const slide = slides.find((s) => s.index === settingsFor);
        if (!slide) return null;
        return (
          <Dialog open onOpenChange={(o) => { if (!o) setSettingsFor(null); }}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Slide {slide.index} · Configurações da imagem</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                {slide.image_briefing && (
                  <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs">
                    <div className="font-semibold text-muted-foreground uppercase tracking-wider mb-1">Briefing visual (editável)</div>
                    <textarea
                      className="w-full text-foreground/90 bg-transparent resize-y min-h-[80px] focus:outline-none"
                      defaultValue={slide.image_briefing}
                      onBlur={async (e) => {
                        const v = e.target.value;
                        if (v === slide.image_briefing) return;
                        const nextSlides = slides.map((x) => x.index === slide.index ? { ...x, image_briefing: v } : x);
                        await update.mutateAsync({
                          id: item.id,
                          updates: { metadata: { ...meta, carousel: { ...carousel, slides: nextSlides } } },
                        });
                      }}
                    />
                  </div>
                )}
                <SlideImageSettingsForm
                  value={slide.image_settings || {}}
                  onChange={(v) => updateSlideSettings(slide.index, v)}
                  defaultHeadline={slide.headline}
                  sharedMood={carousel.shared_style?.mood}
                  sharedVisualStyle={carousel.shared_style?.visual_style}
                />
              </div>
              <DialogFooter>
                <Button onClick={() => setSettingsFor(null)}>Concluído</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        );
      })()}
    </div>
  );
}
