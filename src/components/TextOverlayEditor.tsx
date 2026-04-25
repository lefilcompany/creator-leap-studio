import { useEffect, useRef, useState, useCallback, useLayoutEffect } from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Type, Loader2, Save, RotateCcw, Copy as CopyIcon, AlignLeft, AlignCenter, AlignRight, MoveUp, MoveDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface TextLayer {
  id: string;
  text: string;
  x: number;            // image-pixel coordinates (top-left of bounding box)
  y: number;
  maxWidth: number;     // wrap width in image pixels
  fontFamily: string;
  fontWeight: number;
  fontItalic: boolean;
  fontSize: number;
  align: "left" | "center" | "right";
  lineHeight: number;
  uppercase: boolean;
  color: string;
  opacity: number;
  rotate: number;
  /** When set, the server will download the font file from this URL instead of Google Fonts. */
  customFontUrl?: string;
  stroke?: { color: string; width: number };
  shadow?: { color: string; blur: number; offsetX: number; offsetY: number };
  background?: { color: string; opacity: number; paddingX: number; paddingY: number; radius?: number; borderOnly?: boolean; borderWidth?: number };
}

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

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  actionId?: string;
  initialLayers?: TextLayer[];
  onSaved: (newImageUrl: string, layers: TextLayer[]) => void;
}

/** ColorField — clean color input with swatch + hex + presets */
function ColorField({
  value,
  onChange,
  presets = COLOR_PRESETS,
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

export function TextOverlayEditor({ open, onOpenChange, imageUrl, actionId, initialLayers, onSaved }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number }>({ w: 1080, h: 1080 });
  const [displaySize, setDisplaySize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [layers, setLayers] = useState<TextLayer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [drag, setDrag] = useState<{ id: string; mode: "move" | "resize"; startX: number; startY: number; layerStartX: number; layerStartY: number; startMaxW: number } | null>(null);

  const displayScale = naturalSize.w ? displaySize.w / naturalSize.w : 1;

  // Initialize layers when opening
  useEffect(() => {
    if (!open) return;
    if (initialLayers?.length) {
      setLayers(initialLayers);
      setSelectedId(initialLayers[0].id);
    } else {
      const init = defaultLayer(naturalSize.w, naturalSize.h);
      setLayers([init]);
      setSelectedId(init.id);
    }
  }, [open]);

  // Fit image into available stage area while preserving aspect ratio
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

  useLayoutEffect(() => {
    recomputeFit();
  }, [recomputeFit, open]);

  useEffect(() => {
    if (!open) return;
    const ro = new ResizeObserver(() => recomputeFit());
    if (stageRef.current) ro.observe(stageRef.current);
    window.addEventListener("resize", recomputeFit);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", recomputeFit);
    };
  }, [recomputeFit, open]);

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

  // Drag handlers
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

  const handleSave = async () => {
    if (!imageUrl) return;
    setSaving(true);
    try {
      const { data, error } = await supabase.functions.invoke("render-text-overlay", {
        body: {
          imageUrl,
          imageWidth: naturalSize.w,
          imageHeight: naturalSize.h,
          layers,
          actionId,
        },
      });
      if (error) throw error;
      if (!data?.editedImageUrl) throw new Error("Sem URL da imagem editada");
      const finalUrl = `${data.editedImageUrl}?t=${Date.now()}`;
      onSaved(finalUrl, layers);
      toast.success("Texto aplicado! Nova versão salva.");
      onOpenChange(false);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "Falha ao aplicar texto");
    } finally {
      setSaving(false);
    }
  };

  const resetLayers = () => {
    const init = defaultLayer(naturalSize.w, naturalSize.h);
    setLayers([init]);
    setSelectedId(init.id);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%] w-[96vw] h-[94vh] max-w-[1600px] bg-card rounded-2xl shadow-2xl border border-border/40 overflow-hidden data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
        >
          <DialogPrimitive.Title className="sr-only">Editor de texto na imagem</DialogPrimitive.Title>

          <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] h-full min-h-0">
            {/* === Canvas pane === */}
            <div className="flex flex-col bg-muted/20 min-w-0 min-h-0">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-border/40 shrink-0">
                <div className="flex items-center gap-2 text-base font-semibold">
                  <Type className="h-4 w-4" /> Editor de texto na imagem
                </div>
                <DialogPrimitive.Close className="rounded-md p-1.5 hover:bg-muted transition-colors">
                  <X className="h-4 w-4" />
                </DialogPrimitive.Close>
              </div>

              {/* Stage (image fits 100% of available area) */}
              <div ref={stageRef} className="flex-1 min-h-0 p-3 sm:p-4 flex items-center justify-center">
                {displaySize.w > 0 && (
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
                      src={imageUrl}
                      onLoad={onImgLoad}
                      alt="Imagem base"
                      className="block w-full h-full rounded-lg shadow-lg pointer-events-none object-contain bg-black/5"
                      draggable={false}
                      crossOrigin="anonymous"
                    />
                    {/* Layers */}
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

              {/* Footer */}
              <div className="px-5 py-3 border-t border-border/40 flex items-center justify-between gap-3 shrink-0 bg-card/40">
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={addLayer} className="gap-1.5">
                    <Plus className="h-4 w-4" /> Camada
                  </Button>
                  <Button size="sm" variant="ghost" onClick={resetLayers} className="gap-1.5">
                    <RotateCcw className="h-4 w-4" /> Resetar
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
                  <Button onClick={handleSave} disabled={saving || layers.length === 0} className="gap-1.5">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Aplicar e salvar
                  </Button>
                </div>
              </div>
            </div>

            {/* === Sidebar === */}
            <div className="border-l border-border/40 bg-card flex flex-col min-h-0">
              <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between shrink-0">
                <p className="text-sm font-medium">Camadas</p>
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

                    {/* Color — full width with presets */}
                    <div className="space-y-1.5">
                      <Label className="text-xs">Cor da fonte</Label>
                      <ColorField value={selected.color} onChange={(v) => updateLayer(selected.id, { color: v })} />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Opacidade</Label>
                        <span className="text-xs text-muted-foreground">{Math.round(selected.opacity * 100)}%</span>
                      </div>
                      <Slider
                        min={0} max={1} step={0.05}
                        value={[selected.opacity]}
                        onValueChange={(v) => updateLayer(selected.id, { opacity: v[0] })}
                      />
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

                    {/* Background band */}
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

                    {/* Stroke */}
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

                    {/* Shadow */}
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
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
