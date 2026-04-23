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
import {
  Plus, Trash2, Type, Loader2, Save, RotateCcw, Copy as CopyIcon,
  AlignLeft, AlignCenter, AlignRight, MoveUp, MoveDown, ArrowRight, SkipForward,
  Sparkles, CheckCircle2,
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

function ColorField({
  value, onChange, presets = COLOR_PRESETS,
}: { value: string; onChange: (v: string) => void; presets?: string[] }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="relative h-9 w-9 rounded-md border border-border/60 overflow-hidden cursor-pointer shrink-0" style={{ background: value }}>
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
          className="h-9 font-mono text-xs uppercase"
          maxLength={7}
        />
      </div>
      <div className="grid grid-cols-10 gap-1">
        {presets.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={cn(
              "h-5 w-full rounded border transition-transform hover:scale-110",
              value.toLowerCase() === c.toLowerCase() ? "border-primary ring-2 ring-primary/40" : "border-border/40"
            )}
            style={{ background: c }}
            title={c}
          />
        ))}
      </div>
    </div>
  );
}

interface LocationState {
  imageUrl: string;
  actionId?: string;
  nextRoute: string;          // where to go after editing (or skipping)
  nextStateKey: string;       // key inside nextState that holds the image URL ("mediaUrl" | "imageUrl")
  nextState: any;             // original state to forward to result page
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
  const [drag, setDrag] = useState<{ id: string; mode: "move" | "resize"; startX: number; startY: number; layerStartX: number; layerStartY: number; startMaxW: number } | null>(null);

  const displayScale = naturalSize.w ? displaySize.w / naturalSize.w : 1;

  // Bail out if nothing was passed
  useEffect(() => {
    if (!state.imageUrl || !state.nextRoute) {
      toast.error("Sem imagem para editar");
      navigate("/dashboard");
    }
  }, []);

  // Init with one default layer
  useEffect(() => {
    const init = defaultLayer(naturalSize.w, naturalSize.h);
    setLayers([init]);
    setSelectedId(init.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fit image into available stage area
  const recomputeFit = useCallback(() => {
    const stage = stageRef.current;
    if (!stage || !naturalSize.w || !naturalSize.h) return;
    const aw = stage.clientWidth;
    const ah = stage.clientHeight;
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

  const onPointerDownLayer = (e: React.PointerEvent, id: string, mode: "move" | "resize") => {
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
    } else {
      updateLayer(drag.id, {
        maxWidth: Math.max(40, Math.round(drag.startMaxW + dx)),
      });
    }
  };

  const onPointerUp = () => setDrag(null);

  const goToResult = (finalImageUrl: string) => {
    const nextState = { ...(state.nextState || {}) };
    if (state.nextStateKey === "contentData") {
      // CreateImage / CreateContent flow
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

    // If user added no real text, just skip the render call.
    const hasText = layers.some((l) => (l.text || "").trim().length > 0);
    if (!hasText) {
      goToResult(state.imageUrl);
      return;
    }

    setSaving(true);
    setApplyStage("preparing");
    try {
      // Tiny delay so user sees the stage transition
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
      // Quick fade before navigating
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
    <div className="fixed inset-0 z-40 bg-background flex flex-col animate-fade-in">
      {/* === Top bar === */}
      <header className="shrink-0 border-b border-border/40 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
        <div className="px-4 sm:px-6 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-primary/10 text-primary rounded-lg p-1.5 shrink-0">
              <Type className="h-4 w-4" />
            </div>
            <div className="min-w-0 hidden sm:block">
              <p className="text-sm font-semibold leading-tight truncate">Editor de texto na imagem</p>
              <p className="text-xs text-muted-foreground leading-tight flex items-center gap-1 truncate">
                <CheckCircle2 className="h-3 w-3 text-primary shrink-0" />
                Imagem gerada — adicione textos e finalize
              </p>
            </div>
          </div>

          <div className="hidden lg:flex items-center bg-muted/30 rounded-lg px-3 py-1.5 border border-border/40">
            <CreationProgressBar currentStep="edit" activeLoading={saving} />
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
          </div>
        </div>
      </header>

      {/* === Body: canvas (left) + tools (right) === */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
        {/* Canvas */}
        <section className="flex-1 min-w-0 min-h-0 flex flex-col bg-muted/20">
          <div ref={stageRef} className="flex-1 min-h-0 p-4 sm:p-6 flex items-center justify-center overflow-hidden">
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
                  <img src={state.imageUrl} onLoad={onImgLoad} alt="" className="hidden" crossOrigin="anonymous" />
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

          {/* Canvas footer toolbar */}
          <div className="shrink-0 border-t border-border/40 bg-card/40 px-4 py-2 flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={addLayer} className="gap-1.5">
              <Plus className="h-4 w-4" /> Nova camada
            </Button>
            <Button size="sm" variant="ghost" onClick={resetLayers} className="gap-1.5">
              <RotateCcw className="h-4 w-4" /> Resetar
            </Button>
            <span className="ml-auto text-xs text-muted-foreground tabular-nums">
              {naturalSize.w}×{naturalSize.h}px
            </span>
          </div>
        </section>

        {/* Tools sidebar */}
        <aside className="w-full lg:w-[360px] shrink-0 border-t lg:border-t-0 lg:border-l border-border/40 bg-card flex flex-col min-h-0 max-h-full lg:max-h-none">
          {/* Layers list */}
          <div className="shrink-0 px-4 py-3 border-b border-border/40 flex items-center justify-between">
            <p className="text-sm font-semibold">Camadas</p>
            <Button size="sm" variant="ghost" onClick={addLayer} className="h-7 gap-1 text-xs">
              <Plus className="h-3.5 w-3.5" /> Nova
            </Button>
          </div>

          <ScrollArea className="flex-1 min-h-0">
            <div className="p-3 space-y-1.5">
              {layers.map((l, i) => (
                <button
                  key={l.id}
                  onClick={() => setSelectedId(l.id)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg border transition-colors flex items-center gap-2",
                    selectedId === l.id ? "border-primary bg-primary/10" : "border-border/40 hover:bg-muted/40"
                  )}
                >
                  <Type className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="flex-1 truncate text-sm">{l.text || `Camada ${i + 1}`}</span>
                  <span className="flex items-center gap-0.5 opacity-70">
                    <span role="button" onClick={(e) => { e.stopPropagation(); moveLayer(l.id, -1); }} className="p-1 hover:bg-muted rounded"><MoveUp className="h-3 w-3" /></span>
                    <span role="button" onClick={(e) => { e.stopPropagation(); moveLayer(l.id, 1); }} className="p-1 hover:bg-muted rounded"><MoveDown className="h-3 w-3" /></span>
                    <span role="button" onClick={(e) => { e.stopPropagation(); duplicateLayer(l.id); }} className="p-1 hover:bg-muted rounded"><CopyIcon className="h-3 w-3" /></span>
                    <span role="button" onClick={(e) => { e.stopPropagation(); removeLayer(l.id); }} className="p-1 hover:bg-destructive/10 text-destructive rounded"><Trash2 className="h-3 w-3" /></span>
                  </span>
                </button>
              ))}
              {layers.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6">Nenhuma camada. Clique em "Nova" para começar.</p>
              )}
            </div>

            {selected && (
              <div className="p-4 space-y-4 border-t border-border/40">
                <div className="space-y-1.5">
                  <Label className="text-xs">Texto</Label>
                  <Textarea
                    value={selected.text}
                    onChange={(e) => updateLayer(selected.id, { text: e.target.value })}
                    rows={3}
                    className="resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Fonte</Label>
                  <Select value={selected.fontFamily} onValueChange={(v) => updateLayer(selected.id, { fontFamily: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FONT_OPTIONS.map((f) => (
                        <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Peso</Label>
                    <Select value={String(selected.fontWeight)} onValueChange={(v) => updateLayer(selected.id, { fontWeight: parseInt(v) })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="400">Regular</SelectItem>
                        <SelectItem value="700">Bold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5 flex flex-col">
                    <Label className="text-xs">Itálico</Label>
                    <div className="flex items-center h-9">
                      <Switch checked={selected.fontItalic} onCheckedChange={(v) => updateLayer(selected.id, { fontItalic: v })} />
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Tamanho</Label>
                    <span className="text-xs text-muted-foreground">{selected.fontSize}px</span>
                  </div>
                  <Slider
                    min={10} max={Math.max(50, Math.round(naturalSize.h * 0.4))} step={1}
                    value={[selected.fontSize]}
                    onValueChange={(v) => updateLayer(selected.id, { fontSize: v[0] })}
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Largura máxima (quebra)</Label>
                    <span className="text-xs text-muted-foreground">{selected.maxWidth}px</span>
                  </div>
                  <Slider
                    min={40} max={Math.max(200, naturalSize.w)} step={1}
                    value={[selected.maxWidth]}
                    onValueChange={(v) => updateLayer(selected.id, { maxWidth: v[0] })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Alinhamento</Label>
                  <div className="grid grid-cols-3 gap-1">
                    {(["left", "center", "right"] as const).map((a) => (
                      <Button
                        key={a}
                        type="button"
                        variant={selected.align === a ? "default" : "outline"}
                        size="sm"
                        onClick={() => updateLayer(selected.id, { align: a })}
                      >
                        {a === "left" ? <AlignLeft className="h-4 w-4" /> : a === "center" ? <AlignCenter className="h-4 w-4" /> : <AlignRight className="h-4 w-4" />}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs">Cor da fonte</Label>
                  <ColorField value={selected.color} onChange={(v) => updateLayer(selected.id, { color: v })} />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Opacidade</Label>
                    <span className="text-xs text-muted-foreground">{Math.round(selected.opacity * 100)}%</span>
                  </div>
                  <Slider min={0} max={1} step={0.05} value={[selected.opacity]} onValueChange={(v) => updateLayer(selected.id, { opacity: v[0] })} />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Rotação</Label>
                    <span className="text-xs text-muted-foreground">{selected.rotate}°</span>
                  </div>
                  <Slider min={-180} max={180} step={1} value={[selected.rotate]} onValueChange={(v) => updateLayer(selected.id, { rotate: v[0] })} />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs">Espaçamento entre linhas</Label>
                    <span className="text-xs text-muted-foreground">{selected.lineHeight.toFixed(2)}</span>
                  </div>
                  <Slider min={0.8} max={2.5} step={0.05} value={[selected.lineHeight]} onValueChange={(v) => updateLayer(selected.id, { lineHeight: v[0] })} />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-xs">MAIÚSCULAS</Label>
                  <Switch checked={selected.uppercase} onCheckedChange={(v) => updateLayer(selected.id, { uppercase: v })} />
                </div>

                <div className="border-t border-border/40 pt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Fundo atrás do texto</Label>
                    <Switch
                      checked={!!selected.background}
                      onCheckedChange={(v) => updateLayer(selected.id, {
                        background: v ? { color: "#000000", opacity: 0.5, paddingX: 16, paddingY: 8 } : undefined
                      })}
                    />
                  </div>
                  {selected.background && (
                    <div className="space-y-3">
                      <ColorField value={selected.background.color} onChange={(v) => updateLayer(selected.id, { background: { ...selected.background!, color: v } })} />
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Opacidade</Label>
                            <span className="text-xs text-muted-foreground">{Math.round(selected.background.opacity * 100)}%</span>
                          </div>
                          <Slider min={0} max={1} step={0.05} value={[selected.background.opacity]} onValueChange={(v) => updateLayer(selected.id, { background: { ...selected.background!, opacity: v[0] } })} />
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Padding X</Label>
                            <span className="text-xs text-muted-foreground">{selected.background.paddingX}</span>
                          </div>
                          <Slider min={0} max={80} step={1} value={[selected.background.paddingX]} onValueChange={(v) => updateLayer(selected.id, { background: { ...selected.background!, paddingX: v[0] } })} />
                        </div>
                        <div className="space-y-1.5 col-span-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Padding Y</Label>
                            <span className="text-xs text-muted-foreground">{selected.background.paddingY}</span>
                          </div>
                          <Slider min={0} max={80} step={1} value={[selected.background.paddingY]} onValueChange={(v) => updateLayer(selected.id, { background: { ...selected.background!, paddingY: v[0] } })} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-border/40 pt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Contorno</Label>
                    <Switch
                      checked={!!selected.stroke}
                      onCheckedChange={(v) => updateLayer(selected.id, {
                        stroke: v ? { color: "#000000", width: 2 } : undefined
                      })}
                    />
                  </div>
                  {selected.stroke && (
                    <div className="space-y-3">
                      <ColorField value={selected.stroke.color} onChange={(v) => updateLayer(selected.id, { stroke: { ...selected.stroke!, color: v } })} />
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Espessura</Label>
                          <span className="text-xs text-muted-foreground">{selected.stroke.width}px</span>
                        </div>
                        <Slider min={1} max={12} step={1} value={[selected.stroke.width]} onValueChange={(v) => updateLayer(selected.id, { stroke: { ...selected.stroke!, width: v[0] } })} />
                      </div>
                    </div>
                  )}
                </div>

                <div className="border-t border-border/40 pt-3 space-y-2 pb-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Sombra</Label>
                    <Switch
                      checked={!!selected.shadow}
                      onCheckedChange={(v) => updateLayer(selected.id, {
                        shadow: v ? { color: "#000000", blur: 4, offsetX: 2, offsetY: 2 } : undefined
                      })}
                    />
                  </div>
                  {selected.shadow && (
                    <div className="space-y-3">
                      <ColorField value={selected.shadow.color} onChange={(v) => updateLayer(selected.id, { shadow: { ...selected.shadow!, color: v } })} />
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Blur</Label>
                            <span className="text-xs text-muted-foreground">{selected.shadow.blur}</span>
                          </div>
                          <Slider min={0} max={30} step={1} value={[selected.shadow.blur]} onValueChange={(v) => updateLayer(selected.id, { shadow: { ...selected.shadow!, blur: v[0] } })} />
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Offset X</Label>
                            <span className="text-xs text-muted-foreground">{selected.shadow.offsetX}</span>
                          </div>
                          <Slider min={-20} max={20} step={1} value={[selected.shadow.offsetX]} onValueChange={(v) => updateLayer(selected.id, { shadow: { ...selected.shadow!, offsetX: v[0] } })} />
                        </div>
                        <div className="space-y-1.5 col-span-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs">Offset Y</Label>
                            <span className="text-xs text-muted-foreground">{selected.shadow.offsetY}</span>
                          </div>
                          <Slider min={-20} max={20} step={1} value={[selected.shadow.offsetY]} onValueChange={(v) => updateLayer(selected.id, { shadow: { ...selected.shadow!, offsetY: v[0] } })} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </ScrollArea>
        </aside>
      </div>

      {/* Loading overlay while applying text */}
      {saving && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center animate-fade-in">
          <div className="bg-card rounded-2xl shadow-2xl border border-border/40 px-8 py-7 max-w-md w-[90%] flex flex-col items-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-full blur-xl opacity-40 animate-pulse" />
              <div className="relative bg-gradient-to-r from-primary to-accent text-white rounded-full p-4">
                {applyStage === "done" ? (
                  <CheckCircle2 className="h-7 w-7" />
                ) : (
                  <Sparkles className="h-7 w-7 animate-pulse" />
                )}
              </div>
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-semibold">{applyStage === "done" ? "Tudo pronto!" : "Aplicando seu texto"}</h3>
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
