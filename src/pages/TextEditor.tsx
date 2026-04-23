import { useEffect, useRef, useState, useCallback, useLayoutEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Plus, Trash2, Type, Loader2, RotateCcw, Copy as CopyIcon,
  AlignLeft, AlignCenter, AlignRight, MoveUp, MoveDown, ArrowRight, SkipForward,
  Sparkles, CheckCircle2, X, Layers as LayersIcon, Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CreationProgressBar } from "@/components/CreationProgressBar";
import type { TextLayer } from "@/components/TextOverlayEditor";

const FONT_OPTIONS = [
  "Montserrat", "Inter", "Poppins", "Roboto", "Playfair Display",
  "Bebas Neue", "Oswald", "Lato", "Raleway", "Merriweather",
  "Anton", "Archivo Black", "DM Sans",
];

const COLOR_PRESETS = [
  "#ffffff", "#000000", "#f43f5e", "#f97316", "#eab308",
  "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

function defaultLayer(canvasW: number, canvasH: number): TextLayer {
  return {
    id: uid(),
    text: "Seu texto aqui",
    x: Math.round(canvasW * 0.1),
    y: Math.round(canvasH * 0.1),
    maxWidth: Math.round(canvasW * 0.8),
    fontFamily: "Montserrat",
    fontWeight: 700,
    fontItalic: false,
    fontSize: Math.round(canvasH * 0.06),
    align: "left",
    lineHeight: 1.2,
    uppercase: false,
    color: "#ffffff",
    opacity: 1,
    rotate: 0,
  };
}

/** Compact color swatch that opens a popover with palette + hex input. */
function ColorField({
  value, onChange, presets = COLOR_PRESETS,
}: { value: string; onChange: (v: string) => void; presets?: string[] }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="h-7 w-7 rounded-md border border-border/60 shadow-sm hover:scale-105 transition-transform shrink-0"
          style={{ background: value }}
          title={value}
        />
      </PopoverTrigger>
      <PopoverContent className="w-56 p-3" align="end">
        <div className="space-y-3">
          <div className="grid grid-cols-5 gap-1.5">
            {presets.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onChange(c)}
                className={cn(
                  "h-7 w-full rounded border transition-transform hover:scale-110",
                  value.toLowerCase() === c.toLowerCase()
                    ? "border-primary ring-2 ring-primary/40"
                    : "border-border/40"
                )}
                style={{ background: c }}
                title={c}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            <label
              className="relative h-8 w-8 rounded-md border border-border/60 overflow-hidden cursor-pointer shrink-0"
              style={{ background: value }}
            >
              <input
                type="color"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </label>
            <Input
              value={value.toUpperCase()}
              onChange={(e) => {
                let v = e.target.value.trim();
                if (!v.startsWith("#")) v = "#" + v;
                if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v);
              }}
              className="h-8 font-mono text-xs uppercase"
              maxLength={7}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** Compact numeric stepper. */
function NumInput({
  value, onChange, min, max, step = 1, suffix,
}: {
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
}) {
  const clamp = (n: number) => Math.min(max, Math.max(min, n));
  return (
    <div className="flex items-center h-7 rounded-md border border-border/60 bg-background overflow-hidden text-xs">
      <button
        type="button"
        onClick={() => onChange(clamp(value - step))}
        className="px-1.5 h-full text-muted-foreground hover:bg-muted"
        tabIndex={-1}
      >−</button>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const n = parseFloat(e.target.value);
          if (!isNaN(n)) onChange(clamp(n));
        }}
        className="w-full min-w-0 text-center bg-transparent outline-none tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      {suffix && <span className="pr-1.5 text-muted-foreground">{suffix}</span>}
      <button
        type="button"
        onClick={() => onChange(clamp(value + step))}
        className="px-1.5 h-full text-muted-foreground hover:bg-muted"
        tabIndex={-1}
      >+</button>
    </div>
  );
}

/** Section with a title row — compact grouping. */
function Section({
  title,
  icon,
  children,
  action,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/40 bg-background/50 overflow-hidden">
      <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-border/40 bg-muted/30">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground/80 uppercase tracking-wide">
          {icon}
          {title}
        </div>
        {action}
      </div>
      <div className="p-2.5 space-y-2">{children}</div>
    </div>
  );
}

/** Compact inline row: label on left, control on right. */
function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-2 min-h-7">
      <Label className="text-xs text-muted-foreground shrink-0">{label}</Label>
      <div className="flex-1 max-w-[60%] flex justify-end">{children}</div>
    </div>
  );
}


interface LocationState {
  imageUrl: string;
  actionId?: string;
  nextRoute: string;
  nextStateKey: string;
  nextState: any;
}

export default function TextEditor() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state || {}) as Partial<LocationState>;

  const stageRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number }>({ w: 1080, h: 1080 });
  const [displaySize, setDisplaySize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [layers, setLayers] = useState<TextLayer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [applyStage, setApplyStage] = useState<"idle" | "preparing" | "rendering" | "finalizing" | "done">("idle");
  const [drag, setDrag] = useState<{
    id: string;
    mode: "move" | "resize-right" | "resize-left" | "resize-font-top" | "resize-font-bottom";
    startX: number; startY: number;
    layerStartX: number; layerStartY: number;
    startMaxW: number;
    startFontSize: number;
  } | null>(null);

  const displayScale = naturalSize.w ? displaySize.w / naturalSize.w : 1;

  useEffect(() => {
    if (!state.imageUrl || !state.nextRoute) {
      toast.error("Sem imagem para editar");
      navigate("/dashboard");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const init = defaultLayer(naturalSize.w, naturalSize.h);
    setLayers([init]);
    setSelectedId(init.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recomputeFit = useCallback(() => {
    const stage = stageRef.current;
    if (!stage || !naturalSize.w || !naturalSize.h) return;
    // Safety margin so the image never touches the stage edges and never
    // forces the parent layout to scroll (avoids subpixel rounding issues).
    const SAFETY = 0.92;
    const aw = stage.clientWidth * SAFETY;
    const ah = stage.clientHeight * SAFETY;
    if (aw <= 0 || ah <= 0) return;
    const ratio = naturalSize.w / naturalSize.h;
    let w = aw;
    let h = w / ratio;
    if (h > ah) {
      h = ah;
      w = h * ratio;
    }
    setDisplaySize({ w: Math.floor(w), h: Math.floor(h) });
  }, [naturalSize.w, naturalSize.h]);

  useLayoutEffect(() => { recomputeFit(); }, [recomputeFit]);

  useEffect(() => {
    const ro = new ResizeObserver(() => recomputeFit());
    if (stageRef.current) ro.observe(stageRef.current);
    window.addEventListener("resize", recomputeFit);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recomputeFit);
    };
  }, [recomputeFit]);

  const onImgLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    const w = img.naturalWidth || 1080;
    const h = img.naturalHeight || 1080;
    setNaturalSize({ w, h });
    requestAnimationFrame(recomputeFit);
    setLayers((prev) => prev.length === 0 ? [defaultLayer(w, h)] : prev);
  };

  const selected = layers.find((l) => l.id === selectedId) || null;

  const updateLayer = (id: string, patch: Partial<TextLayer>) => {
    setLayers((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const addLayer = () => {
    const l = defaultLayer(naturalSize.w, naturalSize.h);
    l.y = Math.min(naturalSize.h - 100, l.y + layers.length * 80);
    setLayers((prev) => [...prev, l]);
    setSelectedId(l.id);
  };

  const duplicateLayer = (id: string) => {
    const src = layers.find((l) => l.id === id);
    if (!src) return;
    const copy: TextLayer = { ...src, id: uid(), x: src.x + 30, y: src.y + 30 };
    setLayers((prev) => [...prev, copy]);
    setSelectedId(copy.id);
  };

  const removeLayer = (id: string) => {
    setLayers((prev) => prev.filter((l) => l.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const moveLayer = (id: string, dir: -1 | 1) => {
    setLayers((prev) => {
      const idx = prev.findIndex((l) => l.id === id);
      if (idx < 0) return prev;
      const ni = idx + dir;
      if (ni < 0 || ni >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[ni]] = [next[ni], next[idx]];
      return next;
    });
  };

  const onPointerDownLayer = (
    e: React.PointerEvent,
    id: string,
    mode: "move" | "resize-right" | "resize-left" | "resize-font-top" | "resize-font-bottom",
  ) => {
    e.stopPropagation();
    e.preventDefault();
    const layer = layers.find((l) => l.id === id);
    if (!layer) return;
    setSelectedId(id);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({
      id, mode,
      startX: e.clientX, startY: e.clientY,
      layerStartX: layer.x, layerStartY: layer.y,
      startMaxW: layer.maxWidth,
      startFontSize: layer.fontSize,
    });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const dx = (e.clientX - drag.startX) / Math.max(0.001, displayScale);
    const dy = (e.clientY - drag.startY) / Math.max(0.001, displayScale);
    if (drag.mode === "move") {
      updateLayer(drag.id, {
        x: Math.round(drag.layerStartX + dx),
        y: Math.round(drag.layerStartY + dy),
      });
    } else if (drag.mode === "resize-right") {
      updateLayer(drag.id, {
        maxWidth: Math.max(40, Math.round(drag.startMaxW + dx)),
      });
    } else if (drag.mode === "resize-left") {
      // shrink/grow from the left edge: move x and adjust width inversely
      const newWidth = Math.max(40, Math.round(drag.startMaxW - dx));
      const widthDelta = newWidth - drag.startMaxW;
      updateLayer(drag.id, {
        maxWidth: newWidth,
        x: Math.round(drag.layerStartX - widthDelta),
      });
    } else if (drag.mode === "resize-font-bottom") {
      // dragging down increases font size
      const maxFont = Math.max(50, Math.round(naturalSize.h * 0.4));
      const newSize = Math.min(maxFont, Math.max(10, Math.round(drag.startFontSize + dy)));
      updateLayer(drag.id, { fontSize: newSize });
    } else if (drag.mode === "resize-font-top") {
      // dragging up increases font size
      const maxFont = Math.max(50, Math.round(naturalSize.h * 0.4));
      const newSize = Math.min(maxFont, Math.max(10, Math.round(drag.startFontSize - dy)));
      updateLayer(drag.id, { fontSize: newSize });
    }
  };

  const onPointerUp = () => setDrag(null);

  const goToResult = (finalImageUrl: string) => {
    const nextState = { ...(state.nextState || {}) };
    if (state.nextStateKey === "contentData") {
      nextState.contentData = {
        ...(nextState.contentData || {}),
        mediaUrl: finalImageUrl,
      };
    } else {
      nextState.imageUrl = finalImageUrl;
    }
    navigate(state.nextRoute!, { state: nextState, replace: true });
  };

  const handleApply = async () => {
    if (!state.imageUrl) return;
    const hasText = layers.some((l) => (l.text || "").trim().length > 0);
    if (!hasText) {
      goToResult(state.imageUrl);
      return;
    }
    setSaving(true);
    setApplyStage("preparing");
    try {
      await new Promise((r) => setTimeout(r, 250));
      setApplyStage("rendering");
      const { data, error } = await supabase.functions.invoke("render-text-overlay", {
        body: {
          imageUrl: state.imageUrl,
          imageWidth: naturalSize.w,
          imageHeight: naturalSize.h,
          layers,
          actionId: state.actionId,
        },
      });
      if (error) throw error;
      if (!data?.editedImageUrl) throw new Error("Sem URL da imagem editada");
      setApplyStage("finalizing");
      const finalUrl = `${data.editedImageUrl}?t=${Date.now()}`;
      await new Promise((r) => setTimeout(r, 350));
      setApplyStage("done");
      toast.success("Texto aplicado!");
      setTimeout(() => goToResult(finalUrl), 300);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Falha ao aplicar texto");
      setApplyStage("idle");
      setSaving(false);
    }
  };

  const handleSkip = () => {
    if (!state.imageUrl) return;
    goToResult(state.imageUrl);
  };

  const resetLayers = () => {
    const init = defaultLayer(naturalSize.w, naturalSize.h);
    setLayers([init]);
    setSelectedId(init.id);
  };

  const stageLabel: Record<typeof applyStage, string> = {
    idle: "Pronto",
    preparing: "Preparando camadas de texto…",
    rendering: "Renderizando texto na imagem…",
    finalizing: "Finalizando arquivo…",
    done: "Pronto! Abrindo resultado…",
  };

  return (
    <div className="h-full -mx-4 sm:-mx-6 lg:-mx-8 -my-4 sm:-my-6 flex flex-col bg-background overflow-hidden animate-fade-in">
      {/* === Top bar (fixo no topo do editor) === */}
      <header className="h-14 shrink-0 border-b border-border/40 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 flex items-center justify-between px-4 gap-3 shadow-sm z-20">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary to-accent text-primary-foreground flex items-center justify-center shadow-sm shrink-0">
            <Type className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <h1 className="text-sm font-semibold leading-tight truncate">
              Editor de texto na imagem
            </h1>
            <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
              <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
              Imagem gerada — adicione textos e finalize
            </p>
          </div>
        </div>

        <div className="hidden lg:flex flex-1 max-w-sm justify-center">
          <CreationProgressBar currentStep="edit" activeLoading={saving} compact />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="sm" onClick={handleSkip} disabled={saving} className="gap-1.5">
            <SkipForward className="h-4 w-4" />
            <span className="hidden sm:inline">Pular edição</span>
          </Button>
          <Button size="sm" onClick={handleApply} disabled={saving} className="gap-1.5">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            Aplicar e continuar
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSkip}
            disabled={saving}
            className="h-8 w-8"
            title="Fechar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* === Main body === */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_380px]">
        {/* === Layers sidebar (left) === */}
        <aside className="hidden lg:flex border-r border-border/40 bg-card flex-col min-h-0">
          <div className="shrink-0 px-3 pt-3 pb-2 border-b border-border/40">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground/80 uppercase tracking-wide">
                <LayersIcon className="h-3.5 w-3.5" />
                Camadas
              </div>
              <Button size="sm" variant="ghost" onClick={addLayer} className="h-7 gap-1 text-xs">
                <Plus className="h-3.5 w-3.5" /> Nova
              </Button>
            </div>
          </div>
          <ScrollArea className="flex-1 min-h-0">
            <div className="space-y-1 p-2">
              {layers.length === 0 && (
                <div className="text-xs text-muted-foreground text-center py-6">
                  Nenhuma camada ainda
                </div>
              )}
              {layers.map((l, i) => (
                <button
                  key={l.id}
                  onClick={() => setSelectedId(l.id)}
                  className={cn(
                    "w-full text-left px-2.5 py-1.5 rounded-md border transition-colors flex items-center gap-2 group",
                    selectedId === l.id
                      ? "border-primary bg-primary/10"
                      : "border-border/40 hover:bg-muted/40"
                  )}
                >
                  <Type className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  <span className="flex-1 truncate text-xs">{l.text || `Camada ${i + 1}`}</span>
                  <span className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span role="button" onClick={(e) => { e.stopPropagation(); moveLayer(l.id, -1); }} className="p-1 hover:bg-muted rounded"><MoveUp className="h-3 w-3" /></span>
                    <span role="button" onClick={(e) => { e.stopPropagation(); moveLayer(l.id, 1); }} className="p-1 hover:bg-muted rounded"><MoveDown className="h-3 w-3" /></span>
                    <span role="button" onClick={(e) => { e.stopPropagation(); duplicateLayer(l.id); }} className="p-1 hover:bg-muted rounded"><CopyIcon className="h-3 w-3" /></span>
                    <span role="button" onClick={(e) => { e.stopPropagation(); removeLayer(l.id); }} className="p-1 hover:bg-destructive/10 text-destructive rounded"><Trash2 className="h-3 w-3" /></span>
                  </span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </aside>

        {/* === Canvas (center) === */}
        <section className="flex flex-col min-w-0 min-h-0 overflow-hidden bg-muted/30">
          {/* Canvas top toolbar */}
          <div className="h-12 shrink-0 border-b border-border/40 bg-card/60 backdrop-blur flex items-center justify-between px-4 gap-2">
            <div className="text-xs text-muted-foreground">
              {naturalSize.w > 0 && `${naturalSize.w} × ${naturalSize.h}px`}
              {layers.length > 0 && (
                <span className="ml-3">{layers.length} camada{layers.length === 1 ? "" : "s"}</span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <Button size="sm" variant="outline" onClick={addLayer} className="gap-1.5 h-8">
                <Plus className="h-3.5 w-3.5" /> Camada
              </Button>
              <Button size="sm" variant="ghost" onClick={resetLayers} className="gap-1.5 h-8">
                <RotateCcw className="h-3.5 w-3.5" /> Resetar
              </Button>
            </div>
          </div>

          <div
            ref={stageRef}
            className="flex-1 min-h-0 min-w-0 p-3 sm:p-4 flex items-center justify-center overflow-hidden"
          >
            {state.imageUrl && displaySize.w > 0 && (
              <div
                ref={containerRef}
                className="relative select-none"
                style={{ width: displaySize.w, height: displaySize.h }}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerLeave={onPointerUp}
                onPointerDown={() => setSelectedId(null)}
              >
                <img
                  ref={imgRef}
                  src={state.imageUrl}
                  onLoad={onImgLoad}
                  alt="Imagem base"
                  className="block w-full h-full rounded-lg shadow-2xl pointer-events-none object-contain bg-black/5"
                  draggable={false}
                  crossOrigin="anonymous"
                />
                {!naturalSize.w && (
                  <img
                    src={state.imageUrl}
                    onLoad={onImgLoad}
                    alt=""
                    className="hidden"
                    crossOrigin="anonymous"
                  />
                )}
                <div className="absolute inset-0">
                  {layers.map((l) => {
                    const isSel = l.id === selectedId;
                    const left = l.x * displayScale;
                    const top = l.y * displayScale;
                    const width = l.maxWidth * displayScale;
                    return (
                      <div
                        key={l.id}
                        className={cn(
                          "absolute cursor-move",
                          isSel && "outline outline-2 outline-primary outline-offset-2"
                        )}
                        style={{
                          left, top, width,
                          transform: `rotate(${l.rotate}deg)`,
                          transformOrigin: "top left",
                          fontFamily: l.fontFamily,
                          fontWeight: l.fontWeight,
                          fontStyle: l.fontItalic ? "italic" : "normal",
                          fontSize: l.fontSize * displayScale,
                          lineHeight: l.lineHeight,
                          color: l.color,
                          opacity: l.opacity,
                          textAlign: l.align,
                          textTransform: l.uppercase ? "uppercase" : "none",
                          textShadow: l.shadow
                            ? `${l.shadow.offsetX * displayScale}px ${l.shadow.offsetY * displayScale}px ${l.shadow.blur * displayScale}px ${l.shadow.color}`
                            : undefined,
                          WebkitTextStroke: l.stroke && l.stroke.width > 0
                            ? `${l.stroke.width * displayScale}px ${l.stroke.color}`
                            : undefined,
                          background: l.background && l.background.opacity > 0
                            ? `rgba(${parseInt(l.background.color.slice(1, 3), 16)}, ${parseInt(l.background.color.slice(3, 5), 16)}, ${parseInt(l.background.color.slice(5, 7), 16)}, ${l.background.opacity})`
                            : "transparent",
                          padding: l.background
                            ? `${l.background.paddingY * displayScale}px ${l.background.paddingX * displayScale}px`
                            : 0,
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                        }}
                        onPointerDown={(e) => onPointerDownLayer(e, l.id, "move")}
                      >
                        {l.text || " "}
                        {isSel && (
                          <div
                            onPointerDown={(e) => onPointerDownLayer(e, l.id, "resize")}
                            className="absolute -right-2 top-1/2 -translate-y-1/2 h-6 w-2 bg-primary rounded-full cursor-ew-resize shadow-md"
                            title="Arraste para ajustar largura"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* === Properties sidebar (right) === */}
        <aside className="border-l border-border/40 bg-card flex flex-col min-h-0">

          {/* Properties */}
          <ScrollArea className="flex-1 min-h-0">
            {!selected ? (
              <div className="p-8 text-center text-sm text-muted-foreground">
                <Settings2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
                Selecione uma camada para editar suas propriedades
              </div>
            ) : (
              <div className="p-3 space-y-3">
                {/* Content */}
                <Section title="Conteúdo" icon={<Type className="h-3.5 w-3.5" />}>
                  <Textarea
                    value={selected.text}
                    onChange={(e) => updateLayer(selected.id, { text: e.target.value })}
                    rows={3}
                    className="resize-none text-sm"
                    placeholder="Digite seu texto…"
                  />
                </Section>

                {/* Typography */}
                <Section title="Tipografia">
                  <Row label="Fonte">
                    <Select
                      value={selected.fontFamily}
                      onValueChange={(v) => updateLayer(selected.id, { fontFamily: v })}
                    >
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FONT_OPTIONS.map((f) => (
                          <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Row>

                  <Row label="Peso">
                    <Select
                      value={String(selected.fontWeight)}
                      onValueChange={(v) => updateLayer(selected.id, { fontWeight: parseInt(v) })}
                    >
                      <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="400">Regular</SelectItem>
                        <SelectItem value="700">Bold</SelectItem>
                      </SelectContent>
                    </Select>
                  </Row>

                  <Row label="Tamanho">
                    <NumInput
                      value={selected.fontSize}
                      min={10}
                      max={Math.max(50, Math.round(naturalSize.h * 0.4))}
                      onChange={(v) => updateLayer(selected.id, { fontSize: v })}
                      suffix="px"
                    />
                  </Row>

                  <Row label="Largura">
                    <NumInput
                      value={selected.maxWidth}
                      min={40}
                      max={Math.max(200, naturalSize.w)}
                      onChange={(v) => updateLayer(selected.id, { maxWidth: v })}
                      suffix="px"
                    />
                  </Row>

                  <Row label="Espaçamento">
                    <NumInput
                      value={Number(selected.lineHeight.toFixed(2))}
                      min={0.8}
                      max={2.5}
                      step={0.05}
                      onChange={(v) => updateLayer(selected.id, { lineHeight: Number(v.toFixed(2)) })}
                    />
                  </Row>

                  <Row label="Alinhamento">
                    <div className="grid grid-cols-3 gap-1">
                      {(["left", "center", "right"] as const).map((a) => (
                        <Button
                          key={a}
                          type="button"
                          variant={selected.align === a ? "default" : "outline"}
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => updateLayer(selected.id, { align: a })}
                        >
                          {a === "left" ? <AlignLeft className="h-3.5 w-3.5" /> :
                           a === "center" ? <AlignCenter className="h-3.5 w-3.5" /> :
                           <AlignRight className="h-3.5 w-3.5" />}
                        </Button>
                      ))}
                    </div>
                  </Row>

                  <Row label="Itálico">
                    <Switch
                      checked={selected.fontItalic}
                      onCheckedChange={(v) => updateLayer(selected.id, { fontItalic: v })}
                    />
                  </Row>

                  <Row label="Maiúsculas">
                    <Switch
                      checked={selected.uppercase}
                      onCheckedChange={(v) => updateLayer(selected.id, { uppercase: v })}
                    />
                  </Row>
                </Section>

                {/* Color & opacity */}
                <Section title="Cor e aparência">
                  <Row label="Cor da fonte">
                    <ColorField
                      value={selected.color}
                      onChange={(v) => updateLayer(selected.id, { color: v })}
                    />
                  </Row>

                  <Row label="Opacidade">
                    <NumInput
                      value={Math.round(selected.opacity * 100)}
                      min={0}
                      max={100}
                      onChange={(v) => updateLayer(selected.id, { opacity: v / 100 })}
                      suffix="%"
                    />
                  </Row>

                  <Row label="Rotação">
                    <NumInput
                      value={selected.rotate}
                      min={-180}
                      max={180}
                      onChange={(v) => updateLayer(selected.id, { rotate: v })}
                      suffix="°"
                    />
                  </Row>
                </Section>

                {/* Background band */}
                <Section
                  title="Fundo"
                  action={
                    <Switch
                      checked={!!selected.background}
                      onCheckedChange={(v) => updateLayer(selected.id, {
                        background: v
                          ? { color: "#000000", opacity: 0.5, paddingX: 16, paddingY: 8 }
                          : undefined
                      })}
                    />
                  }
                >
                  {selected.background ? (
                    <>
                      <Row label="Cor">
                        <ColorField
                          value={selected.background.color}
                          onChange={(v) => updateLayer(selected.id, {
                            background: { ...selected.background!, color: v }
                          })}
                        />
                      </Row>
                      <Row label="Opacidade">
                        <NumInput
                          value={Math.round(selected.background.opacity * 100)}
                          min={0}
                          max={100}
                          onChange={(v) => updateLayer(selected.id, {
                            background: { ...selected.background!, opacity: v / 100 }
                          })}
                          suffix="%"
                        />
                      </Row>
                      <Row label="Padding X">
                        <NumInput
                          value={selected.background.paddingX}
                          min={0}
                          max={80}
                          onChange={(v) => updateLayer(selected.id, {
                            background: { ...selected.background!, paddingX: v }
                          })}
                          suffix="px"
                        />
                      </Row>
                      <Row label="Padding Y">
                        <NumInput
                          value={selected.background.paddingY}
                          min={0}
                          max={80}
                          onChange={(v) => updateLayer(selected.id, {
                            background: { ...selected.background!, paddingY: v }
                          })}
                          suffix="px"
                        />
                      </Row>
                    </>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">Faixa colorida atrás do texto.</p>
                  )}
                </Section>

                {/* Stroke */}
                <Section
                  title="Contorno"
                  action={
                    <Switch
                      checked={!!selected.stroke}
                      onCheckedChange={(v) => updateLayer(selected.id, {
                        stroke: v ? { color: "#000000", width: 2 } : undefined
                      })}
                    />
                  }
                >
                  {selected.stroke ? (
                    <>
                      <Row label="Cor">
                        <ColorField
                          value={selected.stroke.color}
                          onChange={(v) => updateLayer(selected.id, {
                            stroke: { ...selected.stroke!, color: v }
                          })}
                        />
                      </Row>
                      <Row label="Espessura">
                        <NumInput
                          value={selected.stroke.width}
                          min={1}
                          max={12}
                          onChange={(v) => updateLayer(selected.id, {
                            stroke: { ...selected.stroke!, width: v }
                          })}
                          suffix="px"
                        />
                      </Row>
                    </>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">Contorno em volta das letras.</p>
                  )}
                </Section>

                {/* Shadow */}
                <Section
                  title="Sombra"
                  action={
                    <Switch
                      checked={!!selected.shadow}
                      onCheckedChange={(v) => updateLayer(selected.id, {
                        shadow: v
                          ? { color: "#000000", blur: 4, offsetX: 2, offsetY: 2 }
                          : undefined
                      })}
                    />
                  }
                >
                  {selected.shadow ? (
                    <>
                      <Row label="Cor">
                        <ColorField
                          value={selected.shadow.color}
                          onChange={(v) => updateLayer(selected.id, {
                            shadow: { ...selected.shadow!, color: v }
                          })}
                        />
                      </Row>
                      <Row label="Desfoque">
                        <NumInput
                          value={selected.shadow.blur}
                          min={0}
                          max={30}
                          onChange={(v) => updateLayer(selected.id, {
                            shadow: { ...selected.shadow!, blur: v }
                          })}
                          suffix="px"
                        />
                      </Row>
                      <Row label="Offset X">
                        <NumInput
                          value={selected.shadow.offsetX}
                          min={-20}
                          max={20}
                          onChange={(v) => updateLayer(selected.id, {
                            shadow: { ...selected.shadow!, offsetX: v }
                          })}
                          suffix="px"
                        />
                      </Row>
                      <Row label="Offset Y">
                        <NumInput
                          value={selected.shadow.offsetY}
                          min={-20}
                          max={20}
                          onChange={(v) => updateLayer(selected.id, {
                            shadow: { ...selected.shadow!, offsetY: v }
                          })}
                          suffix="px"
                        />
                      </Row>
                    </>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">Sombra para destacar o texto.</p>
                  )}
                </Section>


                <div className="h-2" />
              </div>
            )}
          </ScrollArea>
        </aside>
      </div>

      {/* === Loading overlay === */}
      {saving && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center animate-fade-in">
          <div className="bg-card rounded-2xl shadow-2xl border border-border/40 px-8 py-7 max-w-md w-[90%] flex flex-col items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-full blur-xl opacity-40 animate-pulse" />
              <div className="relative bg-gradient-to-r from-primary to-accent text-primary-foreground rounded-full p-4">
                {applyStage === "done" ? (
                  <CheckCircle2 className="h-7 w-7" />
                ) : (
                  <Sparkles className="h-7 w-7 animate-pulse" />
                )}
              </div>
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-semibold">
                {applyStage === "done" ? "Tudo pronto!" : "Aplicando seu texto"}
              </h3>
              <p className="text-sm text-muted-foreground">{stageLabel[applyStage]}</p>
            </div>
            <div className="w-full pt-2">
              <CreationProgressBar
                currentStep={applyStage === "done" ? "result" : "edit"}
                activeLoading={applyStage !== "done"}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
