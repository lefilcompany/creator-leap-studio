import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Sparkles,
  Loader2,
  Layers,
  CheckCircle2,
  ArrowRight,
  Plus,
  Minus,
  ImageIcon,
  FileText,
  Type,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useUpdateCalendarItem,
  type CalendarItem,
} from "@/hooks/useCalendars";
import { AgentFeedback } from "@/components/AgentFeedback";
import { VisualStyleGrid } from "@/components/quick-content/VisualStyleGrid";
import { CameraAngleGrid } from "@/components/quick-content/CameraAngleGrid";

interface SlideImageSettings {
  visualStyle?: string;
  cameraAngle?: string;
  lighting?: string;
  composition?: string;
  mood?: string;
  imageIncludeText?: boolean;
  imageTextContent?: string;
  imageTextPosition?: string;
}

interface CarouselSlide {
  index: number;
  role: "capa" | "desenvolvimento" | "cta" | string;
  headline: string;
  caption_part: string;
  image_briefing: string;
  image_settings?: SlideImageSettings;
  design_action_id?: string | null;
  image_url?: string | null;
  status?: "pending" | "generating" | "done" | "error";
  error?: string | null;
}

const LIGHTING_OPTIONS = [
  { value: "natural", label: "Natural" },
  { value: "studio", label: "Estúdio" },
  { value: "golden_hour", label: "Golden hour" },
  { value: "dramatic", label: "Dramática" },
  { value: "soft", label: "Suave" },
  { value: "neon", label: "Neon" },
];

const COMPOSITION_OPTIONS = [
  { value: "auto", label: "Automática" },
  { value: "rule_of_thirds", label: "Regra dos terços" },
  { value: "centered", label: "Centralizada" },
  { value: "symmetrical", label: "Simétrica" },
  { value: "minimal", label: "Minimalista" },
  { value: "dynamic", label: "Dinâmica" },
];

const MOOD_OPTIONS = [
  { value: "auto", label: "Automático" },
  { value: "energetic", label: "Energético" },
  { value: "calm", label: "Calmo" },
  { value: "professional", label: "Profissional" },
  { value: "playful", label: "Divertido" },
  { value: "luxury", label: "Sofisticado" },
  { value: "warm", label: "Acolhedor" },
];

const TEXT_POSITIONS = [
  { value: "top", label: "Topo" },
  { value: "center", label: "Centro" },
  { value: "bottom", label: "Rodapé" },
  { value: "top-left", label: "Topo esquerdo" },
  { value: "top-right", label: "Topo direito" },
  { value: "bottom-left", label: "Rodapé esquerdo" },
  { value: "bottom-right", label: "Rodapé direito" },
];

interface CarouselMeta {
  enabled?: boolean;
  count?: number;
  suggested_count?: number;
  shared_style?: {
    palette?: string;
    typography?: string;
    mood?: string;
    visual_style?: string;
  } | null;
  slides?: CarouselSlide[];
  generation?: {
    status?: "pending" | "done" | "error";
    error?: string;
    updated_at?: string;
  };
}

const ROLE_LABEL: Record<string, string> = {
  capa: "Capa",
  desenvolvimento: "Desenvolvimento",
  cta: "Chamada final",
};

const ROLE_BADGE: Record<string, string> = {
  capa: "bg-primary/10 text-primary border-primary/20",
  desenvolvimento: "bg-muted text-foreground/70 border-border",
  cta: "bg-success/10 text-success border-success/20",
};

export function CarouselBriefingStage({
  item,
  update,
}: {
  item: CalendarItem;
  update: ReturnType<typeof useUpdateCalendarItem>;
}) {
  const meta = (item.metadata || {}) as Record<string, any>;
  const carousel: CarouselMeta = meta.carousel || {};
  const slides = carousel.slides || [];
  const briefingGen = (meta.briefing_generation || {}) as {
    status?: string;
    kind?: string;
    error?: string;
  };
  const isGenerating =
    briefingGen.status === "pending" && briefingGen.kind === "carousel";

  const [desiredCount, setDesiredCount] = useState<number>(
    carousel.count || carousel.suggested_count || 5,
  );
  const [activeIdx, setActiveIdx] = useState<number>(1);

  const qc = useQueryClient();

  // Polling enquanto IA está gerando
  useEffect(() => {
    if (!isGenerating) return;
    const interval = setInterval(() => {
      qc.invalidateQueries({ queryKey: ["calendar-items", item.calendar_id] });
    }, 3500);
    return () => clearInterval(interval);
  }, [isGenerating, qc, item.calendar_id]);

  const handleSuggest = async () => {
    try {
      const { error } = await supabase.functions.invoke(
        "generate-item-briefing",
        {
          body: {
            item_id: item.id,
            kind: "carousel",
            carousel_count: desiredCount,
          },
        },
      );
      if (error) throw error;
      toast.info("Estruturando carrossel — você pode acompanhar aqui.");
      qc.invalidateQueries({ queryKey: ["calendar-items", item.calendar_id] });
    } catch (e: any) {
      toast.error(e?.message || "Não foi possível gerar a estrutura");
    }
  };

  const updateSlide = (idx: number, patch: Partial<CarouselSlide>) => {
    const next = slides.map((s) => (s.index === idx ? { ...s, ...patch } : s));
    const newCarousel: CarouselMeta = { ...carousel, slides: next };
    update.mutate({
      id: item.id,
      updates: { metadata: { ...(meta || {}), carousel: newCarousel } },
    });
  };

  const addSlide = () => {
    if (slides.length >= 10) return;
    const newIdx = slides.length + 1;
    const next = [
      ...slides,
      {
        index: newIdx,
        role: "desenvolvimento" as const,
        headline: "",
        caption_part: "",
        image_briefing: "",
        status: "pending" as const,
      },
    ];
    const newCarousel: CarouselMeta = {
      ...carousel,
      count: next.length,
      slides: next,
    };
    update.mutate({
      id: item.id,
      updates: { metadata: { ...(meta || {}), carousel: newCarousel } },
    });
  };

  const removeSlide = (idx: number) => {
    if (slides.length <= 3) return;
    const next = slides
      .filter((s) => s.index !== idx)
      .map((s, i) => ({ ...s, index: i + 1 }));
    const newCarousel: CarouselMeta = {
      ...carousel,
      count: next.length,
      slides: next,
    };
    update.mutate({
      id: item.id,
      updates: { metadata: { ...(meta || {}), carousel: newCarousel } },
    });
    if (activeIdx > next.length) setActiveIdx(next.length);
  };

  const ready = slides.length >= 3 &&
    slides.every(
      (s) => s.headline.trim().length > 0 && s.image_briefing.trim().length >= 10,
    );

  const handleApprove = () => {
    update.mutate({
      id: item.id,
      updates: {
        briefing_approved: true,
        briefing_approved_at: new Date().toISOString(),
        stage: "design",
      },
    });
  };

  const activeSlide = slides.find((s) => s.index === activeIdx) || slides[0];

  // ===== Estado vazio: pede para sugerir =====
  if (slides.length === 0) {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/8 to-card p-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="rounded-xl bg-primary text-primary-foreground p-2.5 shrink-0 shadow-md shadow-primary/20">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold">Carrossel — estrutura inteligente</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
                A IA cria a narrativa completa: capa, slides de desenvolvimento e CTA final.
                Cada slide ganha sua copy e direção visual próprias, mas todos seguem o mesmo
                estilo visual para o carrossel ficar coeso.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase font-semibold text-muted-foreground">
                Quantos slides?
              </Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setDesiredCount(Math.max(3, desiredCount - 1))}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  min={3}
                  max={10}
                  value={desiredCount}
                  onChange={(e) =>
                    setDesiredCount(
                      Math.min(10, Math.max(3, Number(e.target.value) || 5)),
                    )
                  }
                  className="w-16 h-9 text-center font-bold"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={() => setDesiredCount(Math.min(10, desiredCount + 1))}
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <span className="text-xs text-muted-foreground">de 3 a 10</span>
              </div>
            </div>
            <Button
              onClick={handleSuggest}
              disabled={isGenerating}
              size="lg"
              className="gap-2 shadow-md shadow-primary/20"
            >
              {isGenerating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {isGenerating ? "Estruturando…" : "Estruturar carrossel com IA"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header com estilo compartilhado e ações */}
      <div className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/6 to-transparent p-4">
        <div className="flex items-start gap-3 flex-wrap">
          <div className="rounded-lg bg-primary text-primary-foreground p-2 shrink-0">
            <Layers className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold">
                Carrossel · {slides.length} slides
              </h3>
              <span className="text-[10px] uppercase font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                Etapa 2 de 4
              </span>
            </div>
            {carousel.shared_style && (
              <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                {carousel.shared_style.palette && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/60">
                    🎨 {carousel.shared_style.palette}
                  </span>
                )}
                {carousel.shared_style.mood && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/60">
                    ✨ {carousel.shared_style.mood}
                  </span>
                )}
                {carousel.shared_style.visual_style && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-muted/60">
                    📷 {carousel.shared_style.visual_style}
                  </span>
                )}
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleSuggest}
            disabled={isGenerating}
            className="gap-1.5 shrink-0"
          >
            {isGenerating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            Regerar com IA
          </Button>
        </div>
      </div>

      {/* Tabs de slides */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
        {slides.map((s) => {
          const isActive = s.index === activeIdx;
          const isReady =
            s.headline.trim().length > 0 && s.image_briefing.trim().length >= 10;
          return (
            <button
              key={s.index}
              type="button"
              onClick={() => setActiveIdx(s.index)}
              className={cn(
                "shrink-0 flex items-center gap-1.5 px-3 h-9 rounded-lg border text-xs font-medium transition-all",
                isActive
                  ? "border-primary bg-primary/10 text-primary shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:bg-muted/40",
              )}
            >
              <span className="font-bold tabular-nums">{s.index}</span>
              <span className="hidden sm:inline">
                {ROLE_LABEL[s.role] || s.role}
              </span>
              {isReady && (
                <CheckCircle2 className="h-3 w-3 text-success" />
              )}
            </button>
          );
        })}
        {slides.length < 10 && (
          <button
            type="button"
            onClick={addSlide}
            className="shrink-0 flex items-center justify-center w-9 h-9 rounded-lg border border-dashed border-border text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
            title="Adicionar slide"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Editor do slide ativo */}
      {activeSlide && (
        <div className="rounded-2xl border-2 border-border bg-card p-4 md:p-5 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                Slide {activeSlide.index}
              </span>
              <span
                className={cn(
                  "text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                  ROLE_BADGE[activeSlide.role] || ROLE_BADGE.desenvolvimento,
                )}
              >
                {ROLE_LABEL[activeSlide.role] || activeSlide.role}
              </span>
            </div>
            {slides.length > 3 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeSlide(activeSlide.index)}
                className="text-destructive hover:text-destructive h-7 px-2 text-xs"
              >
                Remover slide
              </Button>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase font-semibold text-muted-foreground">
              Headline (máx 8 palavras)
            </Label>
            <Input
              value={activeSlide.headline}
              onChange={(e) =>
                updateSlide(activeSlide.index, { headline: e.target.value })
              }
              placeholder="Ex: O segredo que ninguém te conta"
              className="font-bold"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase font-semibold text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-3 w-3" />
                Copy / parte da legenda
              </Label>
              <Textarea
                rows={7}
                value={activeSlide.caption_part}
                onChange={(e) =>
                  updateSlide(activeSlide.index, {
                    caption_part: e.target.value,
                  })
                }
                placeholder="Texto deste slide (40-90 palavras). Vai compor a legenda final."
                className="text-sm resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase font-semibold text-muted-foreground flex items-center gap-1.5">
                <ImageIcon className="h-3 w-3" />
                Briefing visual
              </Label>
              <Textarea
                rows={7}
                value={activeSlide.image_briefing}
                onChange={(e) =>
                  updateSlide(activeSlide.index, {
                    image_briefing: e.target.value,
                  })
                }
                placeholder="Cena, elementos, enquadramento. Estilo herda do shared_style."
                className="text-sm resize-none"
              />
            </div>
          </div>

          {/* ===== Configurações de imagem deste slide ===== */}
          <div className="rounded-xl border border-border/70 bg-muted/20 p-4 space-y-4">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-3.5 w-3.5 text-primary" />
              <h4 className="text-xs uppercase font-bold tracking-wider">
                Configurações da imagem deste slide
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase font-semibold text-muted-foreground">
                  Estilo visual
                </Label>
                <VisualStyleGrid
                  value={
                    activeSlide.image_settings?.visualStyle ||
                    carousel.shared_style?.visual_style ||
                    "realistic"
                  }
                  onChange={(v) =>
                    updateSlide(activeSlide.index, {
                      image_settings: {
                        ...(activeSlide.image_settings || {}),
                        visualStyle: v,
                      },
                    })
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase font-semibold text-muted-foreground">
                  Ângulo de câmera
                </Label>
                <CameraAngleGrid
                  value={activeSlide.image_settings?.cameraAngle || "eye_level"}
                  onChange={(v) =>
                    updateSlide(activeSlide.index, {
                      image_settings: {
                        ...(activeSlide.image_settings || {}),
                        cameraAngle: v,
                      },
                    })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase font-semibold text-muted-foreground">
                  Iluminação
                </Label>
                <Select
                  value={activeSlide.image_settings?.lighting || "natural"}
                  onValueChange={(v) =>
                    updateSlide(activeSlide.index, {
                      image_settings: {
                        ...(activeSlide.image_settings || {}),
                        lighting: v,
                      },
                    })
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LIGHTING_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase font-semibold text-muted-foreground">
                  Composição
                </Label>
                <Select
                  value={activeSlide.image_settings?.composition || "auto"}
                  onValueChange={(v) =>
                    updateSlide(activeSlide.index, {
                      image_settings: {
                        ...(activeSlide.image_settings || {}),
                        composition: v,
                      },
                    })
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COMPOSITION_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase font-semibold text-muted-foreground">
                  Mood
                </Label>
                <Select
                  value={
                    activeSlide.image_settings?.mood ||
                    carousel.shared_style?.mood ||
                    "auto"
                  }
                  onValueChange={(v) =>
                    updateSlide(activeSlide.index, {
                      image_settings: {
                        ...(activeSlide.image_settings || {}),
                        mood: v,
                      },
                    })
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MOOD_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Texto na imagem */}
            <div className="space-y-3 pt-2 border-t border-border/60">
              <div className="flex items-center justify-between gap-3">
                <Label className="text-[11px] uppercase font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Type className="h-3 w-3" />
                  Incluir texto na imagem
                </Label>
                <Switch
                  checked={!!activeSlide.image_settings?.imageIncludeText}
                  onCheckedChange={(v) =>
                    updateSlide(activeSlide.index, {
                      image_settings: {
                        ...(activeSlide.image_settings || {}),
                        imageIncludeText: v,
                        imageTextContent:
                          activeSlide.image_settings?.imageTextContent ||
                          activeSlide.headline,
                      },
                    })
                  }
                />
              </div>
              {activeSlide.image_settings?.imageIncludeText && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2 space-y-1.5">
                    <Label className="text-[11px] uppercase font-semibold text-muted-foreground">
                      Texto
                    </Label>
                    <Input
                      value={activeSlide.image_settings?.imageTextContent || ""}
                      maxLength={50}
                      placeholder="Máx. 50 caracteres"
                      onChange={(e) =>
                        updateSlide(activeSlide.index, {
                          image_settings: {
                            ...(activeSlide.image_settings || {}),
                            imageTextContent: e.target.value,
                          },
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase font-semibold text-muted-foreground">
                      Posição
                    </Label>
                    <Select
                      value={
                        activeSlide.image_settings?.imageTextPosition || "center"
                      }
                      onValueChange={(v) =>
                        updateSlide(activeSlide.index, {
                          image_settings: {
                            ...(activeSlide.image_settings || {}),
                            imageTextPosition: v,
                          },
                        })
                      }
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {TEXT_POSITIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}


      {/* CTA aprovar */}
      <div
        className={cn(
          "rounded-2xl border p-4",
          ready ? "border-success/30 bg-success/5" : "border-border bg-muted/30",
        )}
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-sm">
            {ready
              ? "Estrutura pronta. Avance para gerar todas as imagens."
              : `Preencha headline + briefing visual em todos os ${slides.length} slides para avançar.`}
          </p>
          <Button
            size="lg"
            onClick={handleApprove}
            disabled={!ready || update.isPending}
            className="gap-2 shrink-0"
          >
            <CheckCircle2 className="h-4 w-4" />
            Aprovar e ir para o design
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <AgentFeedback
        agentId="image_briefing"
        targetType="calendar_item_briefing"
        targetId={item.id}
        brandId={(item as any).brand_id || null}
        contentSnapshot={{ carousel: { slides: slides.map((s) => ({ role: s.role, headline: s.headline })) } }}
        label="esta estrutura de carrossel"
      />
    </div>
  );
}
