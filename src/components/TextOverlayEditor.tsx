import { useEffect, useRef, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Type, Loader2, Save, RotateCcw, Copy as CopyIcon, AlignLeft, AlignCenter, AlignRight, MoveUp, MoveDown } from "lucide-react";
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
  stroke?: { color: string; width: number };
  shadow?: { color: string; blur: number; offsetX: number; offsetY: number };
  background?: { color: string; opacity: number; paddingX: number; paddingY: number };
}

const FONT_OPTIONS = [
  "Montserrat", "Inter", "Poppins", "Roboto", "Playfair Display",
  "Bebas Neue", "Oswald", "Lato", "Raleway", "Merriweather",
  "Anton", "Archivo Black", "DM Sans",
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

export function TextOverlayEditor({ open, onOpenChange, imageUrl, actionId, initialLayers, onSaved }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [naturalSize, setNaturalSize] = useState<{ w: number; h: number }>({ w: 1080, h: 1080 });
  const [displayScale, setDisplayScale] = useState(1);
  const [layers, setLayers] = useState<TextLayer[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [drag, setDrag] = useState<{ id: string; mode: "move" | "resize"; startX: number; startY: number; layerStartX: number; layerStartY: number; startMaxW: number } | null>(null);

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

  // Recompute display scale on resize
  const recomputeScale = useCallback(() => {
    const c = containerRef.current;
    if (!c || !naturalSize.w) return;
    const cw = c.clientWidth;
    setDisplayScale(cw / naturalSize.w);
  }, [naturalSize.w]);

  useEffect(() => {
    recomputeScale();
    window.addEventListener("resize", recomputeScale);
    return () => window.removeEventListener("resize", recomputeScale);
  }, [recomputeScale]);

  const onImgLoad = () => {
    const img = imgRef.current;
    if (!img) return;
    const w = img.naturalWidth || 1080;
    const h = img.naturalHeight || 1080;
    setNaturalSize({ w, h });
    requestAnimationFrame(recomputeScale);
    // If layers were created with default size, re-fit
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

  // Drag handlers (pointer events on the canvas)
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-[1400px] h-[92vh] p-0 overflow-hidden bg-card rounded-2xl">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr,360px] h-full">
          {/* Canvas */}
          <div className="flex flex-col bg-muted/20 min-w-0">
            <DialogHeader className="px-5 py-3 border-b border-border/40">
              <DialogTitle className="flex items-center gap-2 text-base">
                <Type className="h-4 w-4" /> Editor de texto na imagem
              </DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-auto p-4 flex items-center justify-center">
              <div
                ref={containerRef}
                className="relative max-w-full max-h-full select-none"
                style={{ width: "min(100%, 900px)" }}
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
                  className="block w-full h-auto rounded-lg shadow-lg pointer-events-none"
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
                        {/* Resize handle (right edge) */}
                        {isSel && (
                          <div
                            onPointerDown={(e) => onPointerDownLayer(e, l.id, "resize")}
                            className="absolute -right-2 top-1/2 -translate-y-1/2 h-6 w-2 bg-primary rounded-full cursor-ew-resize"
                            title="Arraste para ajustar largura"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-border/40 flex items-center justify-between gap-3">
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

          {/* Sidebar */}
          <div className="border-l border-border/40 bg-card flex flex-col min-h-0">
            <div className="px-4 py-3 border-b border-border/40">
              <p className="text-sm font-medium">Camadas</p>
            </div>
            <ScrollArea className="flex-1">
              <div className="p-3 space-y-2">
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
                    <span className="flex items-center gap-1 opacity-70">
                      <span
                        role="button"
                        onClick={(e) => { e.stopPropagation(); moveLayer(l.id, -1); }}
                        className="p-1 hover:bg-muted rounded"
                      ><MoveUp className="h-3 w-3" /></span>
                      <span
                        role="button"
                        onClick={(e) => { e.stopPropagation(); moveLayer(l.id, 1); }}
                        className="p-1 hover:bg-muted rounded"
                      ><MoveDown className="h-3 w-3" /></span>
                      <span
                        role="button"
                        onClick={(e) => { e.stopPropagation(); duplicateLayer(l.id); }}
                        className="p-1 hover:bg-muted rounded"
                      ><CopyIcon className="h-3 w-3" /></span>
                      <span
                        role="button"
                        onClick={(e) => { e.stopPropagation(); removeLayer(l.id); }}
                        className="p-1 hover:bg-destructive/10 text-destructive rounded"
                      ><Trash2 className="h-3 w-3" /></span>
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
                      min={10} max={Math.round(naturalSize.h * 0.4)} step={1}
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
                      min={40} max={naturalSize.w} step={1}
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

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Cor</Label>
                      <Input type="color" value={selected.color} onChange={(e) => updateLayer(selected.id, { color: e.target.value })} className="h-9 p-1" />
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
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Cor</Label>
                          <Input type="color" value={selected.background.color} onChange={(e) => updateLayer(selected.id, { background: { ...selected.background!, color: e.target.value } })} className="h-9 p-1" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Opacidade</Label>
                          <Slider min={0} max={1} step={0.05} value={[selected.background.opacity]} onValueChange={(v) => updateLayer(selected.id, { background: { ...selected.background!, opacity: v[0] } })} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Padding X</Label>
                          <Slider min={0} max={80} step={1} value={[selected.background.paddingX]} onValueChange={(v) => updateLayer(selected.id, { background: { ...selected.background!, paddingX: v[0] } })} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Padding Y</Label>
                          <Slider min={0} max={80} step={1} value={[selected.background.paddingY]} onValueChange={(v) => updateLayer(selected.id, { background: { ...selected.background!, paddingY: v[0] } })} />
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
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Cor</Label>
                          <Input type="color" value={selected.stroke.color} onChange={(e) => updateLayer(selected.id, { stroke: { ...selected.stroke!, color: e.target.value } })} className="h-9 p-1" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Espessura</Label>
                          <Slider min={1} max={12} step={1} value={[selected.stroke.width]} onValueChange={(v) => updateLayer(selected.id, { stroke: { ...selected.stroke!, width: v[0] } })} />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Shadow */}
                  <div className="border-t border-border/40 pt-3 space-y-2">
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
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">Cor</Label>
                          <Input type="color" value={selected.shadow.color} onChange={(e) => updateLayer(selected.id, { shadow: { ...selected.shadow!, color: e.target.value } })} className="h-9 p-1" />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Blur</Label>
                          <Slider min={0} max={30} step={1} value={[selected.shadow.blur]} onValueChange={(v) => updateLayer(selected.id, { shadow: { ...selected.shadow!, blur: v[0] } })} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Offset X</Label>
                          <Slider min={-20} max={20} step={1} value={[selected.shadow.offsetX]} onValueChange={(v) => updateLayer(selected.id, { shadow: { ...selected.shadow!, offsetX: v[0] } })} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Offset Y</Label>
                          <Slider min={-20} max={20} step={1} value={[selected.shadow.offsetY]} onValueChange={(v) => updateLayer(selected.id, { shadow: { ...selected.shadow!, offsetY: v[0] } })} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
