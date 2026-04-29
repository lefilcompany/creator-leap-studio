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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import {
  Plus, Trash2, Type, Loader2, RotateCcw, Copy as CopyIcon,
  AlignLeft, AlignCenter, AlignRight, MoveUp, MoveDown, ArrowRight, SkipForward,
  Sparkles, CheckCircle2, X, Layers as LayersIcon, Settings2, Upload,
  MoreHorizontal, Palette, Wand2, SlidersHorizontal, BookmarkPlus, FolderOpen,
  Grid3x3, Magnet,
} from "lucide-react";
import TextStyleTemplatesDialog from "@/components/text-editor/TextStyleTemplatesDialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CreationProgressBar } from "@/components/CreationProgressBar";
import type { TextLayer } from "@/components/TextOverlayEditor";
import { useCustomFonts, ensureFontLoaded } from "@/hooks/useCustomFonts";
import Wheel from "@uiw/react-color-wheel";
import ShadeSlider from "@uiw/react-color-shade-slider";

// Local HSVA <-> HEX helpers (replaces @uiw/color-convert which is not installed)
type Hsva = { h: number; s: number; v: number; a: number };

function hsvaToHex({ h, s, v, a = 1 }: Hsva): string {
  const sN = s / 100;
  const vN = v / 100;
  const c = vN * sN;
  const hp = (((h % 360) + 360) % 360) / 60;
  const x = c * (1 - Math.abs((hp % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (hp >= 0 && hp < 1) { r = c; g = x; b = 0; }
  else if (hp < 2) { r = x; g = c; b = 0; }
  else if (hp < 3) { r = 0; g = c; b = x; }
  else if (hp < 4) { r = 0; g = x; b = c; }
  else if (hp < 5) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }
  const m = vN - c;
  const toHex = (n: number) => {
    const val = Math.round((n + m) * 255);
    return Math.max(0, Math.min(255, val)).toString(16).padStart(2, "0");
  };
  const hex = `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  if (a >= 1) return hex;
  const aHex = Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, "0");
  return `${hex}${aHex}`;
}

function hexToHsva(hex: string): Hsva {
  let clean = (hex || "#000000").replace("#", "").trim();
  if (clean.length === 3) clean = clean.split("").map((c) => c + c).join("");
  if (clean.length === 6) clean += "ff";
  if (clean.length !== 8) clean = "000000ff";
  const r = parseInt(clean.slice(0, 2), 16) / 255;
  const g = parseInt(clean.slice(2, 4), 16) / 255;
  const b = parseInt(clean.slice(4, 6), 16) / 255;
  const a = parseInt(clean.slice(6, 8), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : (d / max) * 100;
  const v = max * 100;
  return { h, s, v, a };
}

const FONT_OPTIONS = [
  "Montserrat", "Inter", "Poppins", "Roboto", "Playfair Display",
  "Bebas Neue", "Oswald", "Lato", "Raleway", "Merriweather",
  "Anton", "Archivo Black", "DM Sans",
];

const COLOR_PRESETS = [
  // Neutros
  "#ffffff", "#f3f4f6", "#9ca3af", "#4b5563", "#000000",
  // Vermelhos / rosas
  "#fecaca", "#f87171", "#ef4444", "#dc2626", "#ec4899",
  // Laranjas / amarelos
  "#fed7aa", "#fb923c", "#f97316", "#eab308", "#facc15",
  // Verdes
  "#bbf7d0", "#4ade80", "#22c55e", "#16a34a", "#10b981",
  // Azuis / ciano
  "#bae6fd", "#38bdf8", "#06b6d4", "#3b82f6", "#1d4ed8",
  // Roxos
  "#ddd6fe", "#a78bfa", "#8b5cf6", "#7c3aed", "#6d28d9",
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

/** Compact color swatch that opens a popover with chromatic wheel + palette + hex. */
function ColorField({
  value, onChange, presets = COLOR_PRESETS,
}: { value: string; onChange: (v: string) => void; presets?: string[] }) {
  const safeHex = /^#[0-9a-fA-F]{6}$/.test(value) ? value : "#ffffff";
  const hsva = hexToHsva(safeHex);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="h-7 w-7 rounded-full border border-border/60 shadow-sm hover:scale-110 transition-transform shrink-0"
          style={{ background: value }}
          title={value}
        />
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="end">
        <div className="space-y-4">
          {/* Círculo cromático */}
          <div className="flex flex-col items-center gap-3">
            <Wheel
              color={hsva}
              onChange={(c) => onChange(hsvaToHex(c.hsva))}
              width={180}
              height={180}
            />
            <ShadeSlider
              hsva={hsva}
              style={{ width: 180 }}
              onChange={(newShade) =>
                onChange(hsvaToHex({ ...hsva, ...newShade }))
              }
            />
          </div>

          {/* Paleta rápida */}
          <div className="grid grid-cols-6 gap-2 pt-1 border-t border-border/40">
            {presets.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onChange(c)}
                className={cn(
                  "h-6 w-6 rounded-full border transition-transform hover:scale-110",
                  value.toLowerCase() === c.toLowerCase()
                    ? "border-primary ring-2 ring-primary/40"
                    : "border-border/40"
                )}
                style={{ background: c }}
                title={c}
              />
            ))}
          </div>

          {/* Input HEX */}
          <div className="flex items-center gap-2 pt-1 border-t border-border/40">
            <div
              className="h-8 w-8 rounded-full border border-border/60 shrink-0"
              style={{ background: value }}
            />
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
    <div className="flex items-center h-7 rounded-md border border-border/60 bg-background overflow-hidden text-[12px] font-medium">
      <button
        type="button"
        onClick={() => onChange(clamp(value - step))}
        className="px-2 h-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-sm font-semibold"
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
        className="w-full min-w-0 text-center bg-transparent outline-none tabular-nums font-semibold text-foreground/90 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      {suffix && <span className="pr-1.5 text-[10.5px] uppercase tracking-wider text-muted-foreground font-medium">{suffix}</span>}
      <button
        type="button"
        onClick={() => onChange(clamp(value + step))}
        className="px-2 h-full text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-sm font-semibold"
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
    <div className="rounded-xl border border-border/50 bg-background/60 overflow-hidden shadow-sm">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/40 bg-gradient-to-b from-muted/40 to-muted/20">
        <div className="flex items-center gap-2 text-[10.5px] font-bold text-foreground/90 uppercase tracking-[0.08em]">
          {icon}
          {title}
        </div>
        {action}
      </div>
      <div className="p-3 space-y-2.5">{children}</div>
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
    <div className="flex items-center justify-between gap-3 min-h-7">
      <Label className="text-[12px] font-medium text-foreground/70 shrink-0 tracking-tight">{label}</Label>
      <div className="flex-1 max-w-[60%] flex justify-end">{children}</div>
    </div>
  );
}


interface LocationState {
  imageUrl: string;
  sourceImageUrl?: string;
  layers?: TextLayer[];
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
  const { fonts: customFonts, uploading: uploadingFont, uploadFont } = useCustomFonts();
  const fontInputRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();
  const [propsSheetOpen, setPropsSheetOpen] = useState(false);
  const [layersSheetOpen, setLayersSheetOpen] = useState(false);
  const [propsTab, setPropsTab] = useState<"typography" | "appearance" | "effects">("typography");
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [drag, setDrag] = useState<{
    id: string;
    mode: "move" | "resize-right" | "resize-left" | "resize-font-top" | "resize-font-bottom";
    startX: number; startY: number;
    layerStartX: number; layerStartY: number;
    startMaxW: number;
    startFontSize: number;
  } | null>(null);
  // Active alignment guides (in image-pixel coordinates) shown while dragging.
  const [guides, setGuides] = useState<{ v: number[]; h: number[] }>({ v: [], h: [] });
  // Grid + snap toggles, persisted across sessions.
  const [gridDivisions, setGridDivisions] = useState<number>(() => {
    const v = Number(localStorage.getItem("text-editor:gridDivisions"));
    return Number.isFinite(v) && v > 0 ? v : 0; // 0 = off
  });
  const [snapEnabled, setSnapEnabled] = useState<boolean>(() => {
    const v = localStorage.getItem("text-editor:snapEnabled");
    return v === null ? true : v === "1";
  });
  useEffect(() => { localStorage.setItem("text-editor:gridDivisions", String(gridDivisions)); }, [gridDivisions]);
  useEffect(() => { localStorage.setItem("text-editor:snapEnabled", snapEnabled ? "1" : "0"); }, [snapEnabled]);

  const displayScale = naturalSize.w ? displaySize.w / naturalSize.w : 1;
  // Use the original (text-free) image as the canvas base whenever available
  // so the user sees and edits over the same source we re-render server-side.
  const baseImageUrl = state.sourceImageUrl || state.imageUrl;

  useEffect(() => {
    if (!state.imageUrl || !state.nextRoute) {
      toast.error("Sem imagem para editar");
      navigate("/dashboard");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // If we received existing layers from a previous edit, reuse them so the
    // user can keep editing the same texts. Otherwise, start with a default.
    if (Array.isArray(state.layers) && state.layers.length > 0) {
      setLayers(state.layers);
      setSelectedId(state.layers[0]?.id || null);
      // Make sure any custom fonts referenced by existing layers are registered
      // in the document so the preview matches the saved render.
      for (const l of state.layers) {
        if (l.customFontUrl && l.fontFamily) {
          ensureFontLoaded(l.fontFamily, l.customFontUrl);
        }
      }
    } else {
      const init = defaultLayer(naturalSize.w, naturalSize.h);
      setLayers([init]);
      setSelectedId(init.id);
    }
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

  // Approximate the rendered height of a layer in image pixels.
  // Used only for alignment guides (top/middle/bottom edges), not for layout.
  const estimateLayerHeight = (l: TextLayer): number => {
    const lines = Math.max(1, (l.text || " ").split("\n").length);
    const padY = l.background ? l.background.paddingY * 2 : 0;
    return Math.round(l.fontSize * l.lineHeight * lines + padY);
  };

  /**
   * Given a candidate (x, y, width) for the dragged layer, snap to alignment
   * targets from other layers + canvas edges/center. Returns the adjusted
   * position and the list of guide coordinates that matched.
   */
  const computeSnap = (
    layerId: string,
    candX: number,
    candY: number,
    width: number,
    height: number,
  ): { x: number; y: number; vGuides: number[]; hGuides: number[] } => {
    // Snap threshold in IMAGE pixels — convert from a constant CSS pixel
    // tolerance so it feels the same regardless of zoom level.
    const SNAP_PX_CSS = 6;
    const threshold = SNAP_PX_CSS / Math.max(0.001, displayScale);

    // Candidate edges for the dragged layer.
    const candLeft = candX;
    const candRight = candX + width;
    const candCenterX = candX + width / 2;
    const candTop = candY;
    const candBottom = candY + height;
    const candMidY = candY + height / 2;

    // Build target edges from OTHER layers + canvas.
    const vTargets: number[] = [0, naturalSize.w / 2, naturalSize.w];
    const hTargets: number[] = [0, naturalSize.h / 2, naturalSize.h];
    for (const other of layers) {
      if (other.id === layerId) continue;
      const oH = estimateLayerHeight(other);
      vTargets.push(other.x, other.x + other.maxWidth / 2, other.x + other.maxWidth);
      hTargets.push(other.y, other.y + oH / 2, other.y + oH);
    }
    // When grid is on, every grid line becomes a snap target too.
    if (gridDivisions > 0) {
      const stepX = naturalSize.w / gridDivisions;
      const stepY = naturalSize.h / gridDivisions;
      for (let i = 1; i < gridDivisions; i++) {
        vTargets.push(Math.round(stepX * i));
        hTargets.push(Math.round(stepY * i));
      }
    }

    let bestDX = 0, bestDXAbs = threshold + 1;
    let bestDY = 0, bestDYAbs = threshold + 1;
    const vMatches: number[] = [];
    const hMatches: number[] = [];

    // Pick the smallest delta on X across {left, center, right} edges.
    for (const t of vTargets) {
      for (const edge of [candLeft, candCenterX, candRight]) {
        const d = t - edge;
        if (Math.abs(d) <= threshold && Math.abs(d) < bestDXAbs) {
          bestDX = d;
          bestDXAbs = Math.abs(d);
        }
      }
    }
    for (const t of hTargets) {
      for (const edge of [candTop, candMidY, candBottom]) {
        const d = t - edge;
        if (Math.abs(d) <= threshold && Math.abs(d) < bestDYAbs) {
          bestDY = d;
          bestDYAbs = Math.abs(d);
        }
      }
    }

    const snappedX = bestDXAbs <= threshold ? candX + bestDX : candX;
    const snappedY = bestDYAbs <= threshold ? candY + bestDY : candY;

    // After snapping, mark which targets are now coincident (within 0.5 image px)
    // so we render them as visible guides.
    const finalLeft = snappedX;
    const finalRight = snappedX + width;
    const finalCenterX = snappedX + width / 2;
    const finalTop = snappedY;
    const finalBottom = snappedY + height;
    const finalMidY = snappedY + height / 2;
    const eps = 0.5;
    for (const t of vTargets) {
      if (Math.abs(t - finalLeft) <= eps || Math.abs(t - finalCenterX) <= eps || Math.abs(t - finalRight) <= eps) {
        vMatches.push(t);
      }
    }
    for (const t of hTargets) {
      if (Math.abs(t - finalTop) <= eps || Math.abs(t - finalMidY) <= eps || Math.abs(t - finalBottom) <= eps) {
        hMatches.push(t);
      }
    }

    return { x: snappedX, y: snappedY, vGuides: vMatches, hGuides: hMatches };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const dx = (e.clientX - drag.startX) / Math.max(0.001, displayScale);
    const dy = (e.clientY - drag.startY) / Math.max(0.001, displayScale);
    if (drag.mode === "move") {
      const layer = layers.find((l) => l.id === drag.id);
      const candX = drag.layerStartX + dx;
      const candY = drag.layerStartY + dy;
      if (layer) {
        const h = estimateLayerHeight(layer);
        if (snapEnabled) {
          const snap = computeSnap(drag.id, candX, candY, layer.maxWidth, h);
          updateLayer(drag.id, { x: Math.round(snap.x), y: Math.round(snap.y) });
          setGuides({ v: snap.vGuides, h: snap.hGuides });
        } else {
          updateLayer(drag.id, { x: Math.round(candX), y: Math.round(candY) });
          if (guides.v.length || guides.h.length) setGuides({ v: [], h: [] });
        }
      } else {
        updateLayer(drag.id, { x: Math.round(candX), y: Math.round(candY) });
      }
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

  const onPointerUp = () => {
    setDrag(null);
    setGuides({ v: [], h: [] });
  };

  const goToResult = (
    finalImageUrl: string,
    extras?: { textOverlayLayers?: TextLayer[]; textOverlaySourceUrl?: string },
  ) => {
    const nextState = { ...(state.nextState || {}) };
    if (state.nextStateKey === "contentData") {
      nextState.contentData = {
        ...(nextState.contentData || {}),
        mediaUrl: finalImageUrl,
        ...(extras?.textOverlayLayers
          ? { textOverlayLayers: extras.textOverlayLayers }
          : {}),
        ...(extras?.textOverlaySourceUrl
          ? { textOverlaySourceUrl: extras.textOverlaySourceUrl }
          : {}),
      };
    } else {
      nextState.imageUrl = finalImageUrl;
      if (extras?.textOverlayLayers) nextState.textOverlayLayers = extras.textOverlayLayers;
      if (extras?.textOverlaySourceUrl) nextState.textOverlaySourceUrl = extras.textOverlaySourceUrl;
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
          sourceImageUrl: state.sourceImageUrl,
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
      setTimeout(
        () =>
          goToResult(finalUrl, {
            textOverlayLayers: data?.layers || layers,
            textOverlaySourceUrl: data?.sourceImageUrl || state.sourceImageUrl || state.imageUrl,
          }),
        300,
      );
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
    <div className="h-full -mx-4 sm:-mx-6 lg:-mx-8 -my-4 sm:-my-6 flex flex-col bg-gradient-to-b from-muted/30 via-background to-background overflow-hidden animate-fade-in">
      {/* === Top bar (fixo no topo do editor) === */}
      <header className="h-14 shrink-0 border-b border-border/60 bg-card/95 backdrop-blur-xl supports-[backdrop-filter]:bg-card/80 flex items-center justify-between px-4 gap-3 shadow-[0_1px_0_0_hsl(var(--border)/0.4),0_4px_16px_-8px_hsl(var(--foreground)/0.08)] z-20">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary via-primary to-accent text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/25 ring-1 ring-primary-foreground/10 shrink-0">
            <Type className="h-4 w-4" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <h1 className="text-[15px] font-semibold leading-tight tracking-tight truncate">
              Editor de texto
            </h1>
            <p className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5 truncate mt-0.5">
              <CheckCircle2 className="h-3 w-3 text-primary shrink-0" strokeWidth={2.5} />
              <span className="tracking-wide">Imagem pronta — adicione textos e finalize</span>
            </p>
          </div>
        </div>

        <div className="hidden lg:flex flex-1 max-w-sm justify-center">
          <CreationProgressBar currentStep="edit" activeLoading={saving} compact />
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Mobile: open layers */}
          <Sheet open={layersSheetOpen} onOpenChange={setLayersSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="lg:hidden gap-1.5 h-9">
                <LayersIcon className="h-4 w-4" />
                <span className="text-xs">{layers.length}</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
              <div className="px-4 pt-5 pb-3 border-b border-border/40 flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <LayersIcon className="h-4 w-4" /> Camadas
                </div>
                <Button size="sm" variant="ghost" onClick={() => { addLayer(); }} className="h-8 gap-1 text-xs">
                  <Plus className="h-3.5 w-3.5" /> Nova
                </Button>
              </div>
              <ScrollArea className="h-[calc(100vh-64px)]">
                <div className="space-y-1 p-2">
                  {layers.map((l, i) => (
                    <button
                      key={l.id}
                      onClick={() => { setSelectedId(l.id); setLayersSheetOpen(false); setPropsSheetOpen(true); }}
                      className={cn(
                        "w-full text-left px-2.5 py-2 rounded-md border flex items-center gap-2",
                        selectedId === l.id ? "border-primary bg-primary/10" : "border-border/40"
                      )}
                    >
                      <Type className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="flex-1 truncate text-xs">{l.text || `Camada ${i + 1}`}</span>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>

          {/* Mobile: open properties */}
          <Button
            variant="outline"
            size="sm"
            className="lg:hidden gap-1.5 h-9"
            onClick={() => setPropsSheetOpen(true)}
            disabled={!selected}
          >
            <SlidersHorizontal className="h-4 w-4" />
          </Button>

          <Button variant="ghost" size="sm" onClick={handleSkip} disabled={saving} className="hidden sm:inline-flex gap-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground">
            <SkipForward className="h-4 w-4" />
            <span className="hidden md:inline">Pular edição</span>
          </Button>

          <Button
            size="sm"
            onClick={handleApply}
            disabled={saving}
            className="relative overflow-hidden gap-1.5 h-9 px-4 bg-gradient-to-r from-primary via-primary to-accent text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/35 hover:-translate-y-px active:translate-y-0 transition-all duration-200 text-[13px] font-semibold tracking-tight before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent before:-translate-x-full hover:before:translate-x-full before:transition-transform before:duration-700"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin relative z-10" /> : <ArrowRight className="h-4 w-4 relative z-10 group-hover:translate-x-0.5 transition-transform" strokeWidth={2.5} />}
            <span className="hidden sm:inline relative z-10">Aplicar e continuar</span>
            <span className="sm:hidden relative z-10">Aplicar</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9" disabled={saving} title="Mais opções">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setTemplatesOpen(true)} className="gap-2 text-xs">
                <FolderOpen className="h-3.5 w-3.5" /> Aplicar template
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTemplatesOpen(true)} className="gap-2 text-xs">
                <BookmarkPlus className="h-3.5 w-3.5" /> Salvar como template
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={resetLayers} className="gap-2 text-xs">
                <RotateCcw className="h-3.5 w-3.5" /> Resetar camadas
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSkip} className="gap-2 text-xs sm:hidden">
                <SkipForward className="h-3.5 w-3.5" /> Pular edição
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSkip} className="gap-2 text-xs text-muted-foreground">
                <X className="h-3.5 w-3.5" /> Fechar editor
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <TextStyleTemplatesDialog
        open={templatesOpen}
        onOpenChange={setTemplatesOpen}
        currentLayers={layers}
        onApply={(tplLayers) => {
          // Re-anchor positions inside the current canvas so previously-saved
          // coordinates don't end up off-screen on a different aspect ratio.
          const reanchored = tplLayers.map((l, idx) => {
            const w = naturalSize.w || 1080;
            const h = naturalSize.h || 1080;
            const maxW = Math.min(l.maxWidth || w * 0.8, w - 40);
            const x = Math.max(20, Math.min(l.x ?? w * 0.1, w - maxW - 20));
            const y = Math.max(20, Math.min(l.y ?? h * 0.1 + idx * 80, h - 60));
            return { ...l, x, y, maxWidth: maxW };
          });
          setLayers(reanchored);
          setSelectedId(reanchored[0]?.id || null);
        }}
      />

      {/* === Main body === */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_380px]">
        {/* === Layers sidebar (left) === */}
        <aside className="hidden lg:flex border-r border-border/60 bg-gradient-to-b from-card to-card/70 flex-col min-h-0 min-w-0 overflow-hidden shadow-[inset_-1px_0_0_0_hsl(var(--border)/0.3)]">
          <div className="shrink-0 px-3 pt-3 pb-2 border-b border-border/40">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-foreground/90 uppercase tracking-[0.08em]">
                <LayersIcon className="h-3.5 w-3.5" />
                Camadas
                {layers.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full bg-muted text-[9.5px] font-semibold tabular-nums tracking-normal text-muted-foreground">
                    {layers.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-0.5">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setTemplatesOpen(true)}
                  className="h-7 px-2 gap-1 text-[11.5px] font-semibold text-muted-foreground hover:text-primary"
                  title="Salvar ou aplicar template de estilo"
                >
                  <Sparkles className="h-3.5 w-3.5" /> Templates
                </Button>
              </div>
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
            <div className="space-y-1 p-2">
              {layers.length === 0 && (
                <div className="text-[12px] font-medium text-muted-foreground text-center py-6">
                  Nenhuma camada ainda
                </div>
              )}
              {layers.map((l, i) => (
                <div
                  key={l.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedId(l.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedId(l.id); }
                  }}
                  className={cn(
                    "w-full min-w-0 text-left px-2.5 py-2 rounded-md border transition-all duration-200 flex items-center gap-2 group cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary/40 hover:translate-x-0.5 active:scale-[0.98]",
                    selectedId === l.id
                      ? "border-primary bg-primary/10 shadow-sm shadow-primary/10"
                      : "border-border/40 hover:bg-muted/50 hover:border-border"
                  )}
                >
                  <Type className={cn("h-3.5 w-3.5 shrink-0", selectedId === l.id ? "text-primary" : "text-muted-foreground")} />
                  <span className={cn("flex-1 min-w-0 truncate text-[12.5px] leading-tight", selectedId === l.id ? "font-semibold text-foreground" : "font-medium text-foreground/85")}>
                    {l.text || `Camada ${i + 1}`}
                  </span>
                  <span className="hidden group-hover:flex items-center gap-0.5 shrink-0">
                    <button type="button" aria-label="Mover para cima" onClick={(e) => { e.stopPropagation(); moveLayer(l.id, -1); }} className="p-1 hover:bg-muted rounded"><MoveUp className="h-3 w-3" /></button>
                    <button type="button" aria-label="Mover para baixo" onClick={(e) => { e.stopPropagation(); moveLayer(l.id, 1); }} className="p-1 hover:bg-muted rounded"><MoveDown className="h-3 w-3" /></button>
                    <button type="button" aria-label="Duplicar camada" onClick={(e) => { e.stopPropagation(); duplicateLayer(l.id); }} className="p-1 hover:bg-muted rounded"><CopyIcon className="h-3 w-3" /></button>
                    <button type="button" aria-label="Remover camada" onClick={(e) => { e.stopPropagation(); removeLayer(l.id); }} className="p-1 hover:bg-destructive/10 text-destructive rounded"><Trash2 className="h-3 w-3" /></button>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* === Canvas (center) === */}
        <section className="flex flex-col min-w-0 min-h-0 overflow-hidden bg-[radial-gradient(circle_at_50%_50%,hsl(var(--muted)/0.5),hsl(var(--muted)/0.15))] relative">
          {/* Subtle grid pattern */}
          <div className="absolute inset-0 pointer-events-none opacity-[0.025] [background-image:linear-gradient(hsl(var(--foreground))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--foreground))_1px,transparent_1px)] [background-size:24px_24px]" />
          {/* Canvas top toolbar */}
          <div className="relative h-12 shrink-0 border-b border-border/60 bg-card/80 backdrop-blur-xl flex items-center justify-between px-4 gap-2 shadow-sm z-10">
            <div className="text-[11.5px] font-medium text-muted-foreground tabular-nums tracking-wide flex items-center gap-3">
              {naturalSize.w > 0 && (
                <span className="inline-flex items-center gap-1">
                  <span className="text-foreground/70 font-semibold">{naturalSize.w}</span>
                  <span className="opacity-50">×</span>
                  <span className="text-foreground/70 font-semibold">{naturalSize.h}</span>
                  <span className="text-[10px] uppercase tracking-wider opacity-70">px</span>
                </span>
              )}
              {layers.length > 0 && (
                <span className="text-muted-foreground/80">
                  {layers.length} camada{layers.length === 1 ? "" : "s"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              {/* Snap toggle */}
              <Button
                size="sm"
                variant={snapEnabled ? "default" : "outline"}
                onClick={() => setSnapEnabled((v) => !v)}
                className={cn(
                  "gap-1.5 h-8 px-2.5 text-[11.5px] font-semibold",
                  snapEnabled && "bg-primary/15 text-primary border border-primary/30 hover:bg-primary/20"
                )}
                title={snapEnabled ? "Desativar snap de alinhamento" : "Ativar snap de alinhamento"}
                aria-pressed={snapEnabled}
              >
                <Magnet className="h-3.5 w-3.5" /> Snap
              </Button>
              {/* Grid divisions dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant={gridDivisions > 0 ? "default" : "outline"}
                    className={cn(
                      "gap-1.5 h-8 px-2.5 text-[11.5px] font-semibold tabular-nums",
                      gridDivisions > 0 && "bg-primary/15 text-primary border border-primary/30 hover:bg-primary/20"
                    )}
                    title="Mostrar/ocultar grade"
                    aria-pressed={gridDivisions > 0}
                  >
                    <Grid3x3 className="h-3.5 w-3.5" />
                    {gridDivisions > 0 ? `Grade ${gridDivisions}` : "Grade"}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={() => setGridDivisions(0)} className="text-[12.5px]">
                    Sem grade
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {[4, 8, 12, 16, 24].map((n) => (
                    <DropdownMenuItem
                      key={n}
                      onClick={() => setGridDivisions(n)}
                      className="text-[12.5px] flex items-center justify-between"
                    >
                      <span>{n} × {n}</span>
                      {gridDivisions === n && <CheckCircle2 className="h-3.5 w-3.5 text-primary" />}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <div className="h-5 w-px bg-border/60 mx-0.5" />
              <Button size="sm" variant="outline" onClick={addLayer} className="gap-1.5 h-8 text-[12px] font-semibold">
                <Plus className="h-3.5 w-3.5" /> Adicionar texto
              </Button>
            </div>
          </div>

          <div
            ref={stageRef}
            className="relative flex-1 min-h-0 min-w-0 p-4 sm:p-6 lg:p-8 flex items-center justify-center overflow-hidden"
          >
            {baseImageUrl && displaySize.w > 0 && (
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
                  src={baseImageUrl}
                  onLoad={onImgLoad}
                  alt="Imagem base"
                  className="editor-image-reveal block w-full h-full rounded-xl shadow-[0_30px_60px_-15px_rgba(0,0,0,0.35),0_15px_30px_-15px_rgba(0,0,0,0.2)] ring-1 ring-foreground/5 pointer-events-none object-contain bg-black/5 transition-shadow duration-500"
                  draggable={false}
                  crossOrigin="anonymous"
                />
                {!naturalSize.w && (
                  <img
                    src={baseImageUrl}
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
                          "absolute cursor-move group/layer transition-[outline-color,box-shadow,transform] duration-200",
                          isSel && !drag && "editor-layer-selected outline outline-[1.5px] outline-dashed outline-primary outline-offset-[3px] shadow-[0_0_0_4px_hsl(var(--primary)/0.08),0_8px_24px_-8px_hsl(var(--primary)/0.35)]",
                          isSel && drag && "outline-none shadow-[0_12px_32px_-8px_hsl(var(--primary)/0.45)] scale-[1.005]",
                          !isSel && "hover:outline hover:outline-1 hover:outline-dashed hover:outline-primary/40 hover:outline-offset-2"
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
                          background: l.background && l.background.opacity > 0 && !l.background.borderOnly
                            ? `rgba(${parseInt(l.background.color.slice(1, 3), 16)}, ${parseInt(l.background.color.slice(3, 5), 16)}, ${parseInt(l.background.color.slice(5, 7), 16)}, ${l.background.opacity})`
                            : "transparent",
                          border: l.background && l.background.borderOnly && l.background.opacity > 0
                            ? `${(l.background.borderWidth ?? 2) * displayScale}px solid rgba(${parseInt(l.background.color.slice(1, 3), 16)}, ${parseInt(l.background.color.slice(3, 5), 16)}, ${parseInt(l.background.color.slice(5, 7), 16)}, ${l.background.opacity})`
                            : undefined,
                          borderRadius: l.background ? (l.background.radius ?? 0) * displayScale : 0,
                          padding: l.background
                            ? `${l.background.paddingY * displayScale}px ${l.background.paddingX * displayScale}px`
                            : 0,
                          boxSizing: "border-box",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                        }}
                        onPointerDown={(e) => onPointerDownLayer(e, l.id, "move")}
                      >
                        {l.text || " "}
                        {isSel && !drag && (
                          <>
                            {/* Edge bars - width */}
                            <div
                              onPointerDown={(e) => onPointerDownLayer(e, l.id, "resize-right")}
                              className="editor-handle absolute -right-1.5 top-1/2 -translate-y-1/2 h-10 w-1.5 bg-primary rounded-full cursor-ew-resize ring-1 ring-background/80 hover:scale-y-125 hover:w-2 active:scale-y-150 transition-all duration-150"
                              title="Arraste para ajustar largura"
                            />
                            <div
                              onPointerDown={(e) => onPointerDownLayer(e, l.id, "resize-left")}
                              className="editor-handle absolute -left-1.5 top-1/2 -translate-y-1/2 h-10 w-1.5 bg-primary rounded-full cursor-ew-resize ring-1 ring-background/80 hover:scale-y-125 hover:w-2 active:scale-y-150 transition-all duration-150"
                              title="Arraste para ajustar largura"
                            />
                            {/* Edge bars - font size */}
                            <div
                              onPointerDown={(e) => onPointerDownLayer(e, l.id, "resize-font-top")}
                              className="editor-handle absolute left-1/2 -top-1.5 -translate-x-1/2 h-1.5 w-10 bg-primary rounded-full cursor-ns-resize ring-1 ring-background/80 hover:scale-x-125 hover:h-2 active:scale-x-150 transition-all duration-150"
                              title="Arraste para ajustar tamanho do texto"
                            />
                            <div
                              onPointerDown={(e) => onPointerDownLayer(e, l.id, "resize-font-bottom")}
                              className="editor-handle absolute left-1/2 -bottom-1.5 -translate-x-1/2 h-1.5 w-10 bg-primary rounded-full cursor-ns-resize ring-1 ring-background/80 hover:scale-x-125 hover:h-2 active:scale-x-150 transition-all duration-150"
                              title="Arraste para ajustar tamanho do texto"
                            />
                            {/* Corner indicators (visual only) */}
                            <div className="editor-corner absolute -top-1.5 -left-1.5 h-2.5 w-2.5 rounded-sm bg-background border-[1.5px] border-primary shadow-md pointer-events-none" />
                            <div className="editor-corner absolute -top-1.5 -right-1.5 h-2.5 w-2.5 rounded-sm bg-background border-[1.5px] border-primary shadow-md pointer-events-none" style={{ animationDelay: '40ms' }} />
                            <div className="editor-corner absolute -bottom-1.5 -left-1.5 h-2.5 w-2.5 rounded-sm bg-background border-[1.5px] border-primary shadow-md pointer-events-none" style={{ animationDelay: '80ms' }} />
                            <div className="editor-corner absolute -bottom-1.5 -right-1.5 h-2.5 w-2.5 rounded-sm bg-background border-[1.5px] border-primary shadow-md pointer-events-none" style={{ animationDelay: '120ms' }} />
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* Optional grid overlay — purely visual + provides snap targets. */}
                {gridDivisions > 0 && (
                  <svg
                    className="absolute inset-0 pointer-events-none rounded-xl overflow-hidden"
                    width={displaySize.w}
                    height={displaySize.h}
                    viewBox={`0 0 ${displaySize.w} ${displaySize.h}`}
                    aria-hidden
                  >
                    <defs>
                      <pattern
                        id="te-grid-pattern"
                        width={displaySize.w / gridDivisions}
                        height={displaySize.h / gridDivisions}
                        patternUnits="userSpaceOnUse"
                      >
                        <path
                          d={`M ${displaySize.w / gridDivisions} 0 L 0 0 0 ${displaySize.h / gridDivisions}`}
                          fill="none"
                          stroke="hsl(var(--primary))"
                          strokeOpacity="0.18"
                          strokeWidth="1"
                        />
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#te-grid-pattern)" />
                    {/* Center axes with stronger emphasis */}
                    <line
                      x1={displaySize.w / 2} y1={0} x2={displaySize.w / 2} y2={displaySize.h}
                      stroke="hsl(var(--primary))" strokeOpacity="0.32" strokeDasharray="4 4" strokeWidth="1"
                    />
                    <line
                      x1={0} y1={displaySize.h / 2} x2={displaySize.w} y2={displaySize.h / 2}
                      stroke="hsl(var(--primary))" strokeOpacity="0.32" strokeDasharray="4 4" strokeWidth="1"
                    />
                  </svg>
                )}
                {/* Alignment guides — visible only while dragging snaps. */}
                {(guides.v.length > 0 || guides.h.length > 0) && (
                  <div className="absolute inset-0 pointer-events-none">
                    {guides.v.map((x, i) => (
                      <div
                        key={`v-${i}-${x}`}
                        className="editor-guide-v absolute top-0 bottom-0 w-px bg-gradient-to-b from-primary/40 via-primary to-primary/40 shadow-[0_0_8px_hsl(var(--primary)),0_0_16px_hsl(var(--primary)/0.5)]"
                        style={{ left: x * displayScale }}
                      />
                    ))}
                    {guides.h.map((y, i) => (
                      <div
                        key={`h-${i}-${y}`}
                        className="editor-guide-h absolute left-0 right-0 h-px bg-gradient-to-r from-primary/40 via-primary to-primary/40 shadow-[0_0_8px_hsl(var(--primary)),0_0_16px_hsl(var(--primary)/0.5)]"
                        style={{ top: y * displayScale }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        {/* === Properties sidebar (right) — desktop aside, mobile slide-in overlay === */}
        {isMobile && propsSheetOpen && (
          <button
            type="button"
            aria-label="Fechar propriedades"
            onClick={() => setPropsSheetOpen(false)}
            className="lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm animate-fade-in"
          />
        )}
        <aside
          className={cn(
            "border-l border-border/60 bg-gradient-to-b from-card to-card/80 flex flex-col min-h-0 shadow-[inset_1px_0_0_0_hsl(var(--border)/0.3)]",
            "max-lg:fixed max-lg:right-0 max-lg:top-0 max-lg:bottom-0 max-lg:z-50 max-lg:w-[88%] max-lg:max-w-sm max-lg:shadow-2xl max-lg:transition-transform max-lg:duration-200",
            isMobile && !propsSheetOpen && "max-lg:translate-x-full",
            isMobile && propsSheetOpen && "max-lg:translate-x-0",
            !isMobile && "lg:flex"
          )}
        >
          {isMobile && (
            <div className="lg:hidden shrink-0 px-4 h-12 border-b border-border/40 flex items-center justify-between">
              <div className="flex items-center gap-2 text-[13px] font-semibold tracking-tight">
                <SlidersHorizontal className="h-4 w-4" /> Propriedades
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setPropsSheetOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          {/* Properties */}
          <ScrollArea className="flex-1 min-h-0">
            {!selected ? (
              <div className="p-8 text-center text-muted-foreground">
                <Settings2 className="h-8 w-8 mx-auto mb-3 opacity-40" />
                <p className="text-[13px] font-semibold text-foreground/80 tracking-tight">Nenhuma camada selecionada</p>
                <p className="text-[12px] mt-1 text-muted-foreground/80 leading-relaxed max-w-[220px] mx-auto">
                  Selecione uma camada à esquerda para editar suas propriedades
                </p>
              </div>
            ) : (
              <div className="p-3 space-y-3">
                {/* Content */}
                <Section title="Conteúdo" icon={<Type className="h-3.5 w-3.5" />}>
                  <Textarea
                    value={selected.text}
                    onChange={(e) => updateLayer(selected.id, { text: e.target.value })}
                    rows={3}
                    className="resize-none text-[13px] font-medium leading-relaxed"
                    placeholder="Digite seu texto…"
                  />
                </Section>

                <Tabs value={propsTab} onValueChange={(v) => setPropsTab(v as any)} className="w-full">
                  <TabsList className="grid w-full grid-cols-3 h-9 bg-muted/40 p-0.5">
                    <TabsTrigger value="typography" className="text-[11.5px] font-semibold gap-1.5 tracking-tight data-[state=active]:shadow-sm"><Type className="h-3 w-3" />Tipografia</TabsTrigger>
                    <TabsTrigger value="appearance" className="text-[11.5px] font-semibold gap-1.5 tracking-tight data-[state=active]:shadow-sm"><Palette className="h-3 w-3" />Aparência</TabsTrigger>
                    <TabsTrigger value="effects" className="text-[11.5px] font-semibold gap-1.5 tracking-tight data-[state=active]:shadow-sm"><Wand2 className="h-3 w-3" />Efeitos</TabsTrigger>
                  </TabsList>

                  <TabsContent value="typography" className="space-y-3 mt-3">
                {/* Typography */}
                <Section title="Tipografia">
                  <Row label="Fonte">
                    <div className="flex items-center gap-1 w-full justify-end">
                      <Select
                        value={selected.fontFamily}
                        onValueChange={(v) => {
                          const custom = customFonts.find((f) => f.family_name === v);
                          if (custom) {
                            ensureFontLoaded(custom.family_name, custom.file_url);
                            updateLayer(selected.id, {
                              fontFamily: v,
                              customFontUrl: custom.file_url,
                            });
                          } else {
                            updateLayer(selected.id, {
                              fontFamily: v,
                              customFontUrl: undefined,
                            });
                          }
                        }}
                      >
                        <SelectTrigger className="h-7 text-xs flex-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {FONT_OPTIONS.map((f) => (
                            <SelectItem key={f} value={f} style={{ fontFamily: f }}>{f}</SelectItem>
                          ))}
                          {customFonts.length > 0 && (
                            <div className="px-2 pt-2 pb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                              Minhas fontes
                            </div>
                          )}
                          {customFonts.map((f) => (
                            <SelectItem
                              key={f.id}
                              value={f.family_name}
                              style={{ fontFamily: f.family_name }}
                            >
                              {f.display_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <input
                        ref={fontInputRef}
                        type="file"
                        accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (!file) return;
                          const created = await uploadFont(file);
                          if (created && selected) {
                            updateLayer(selected.id, {
                              fontFamily: created.family_name,
                              customFontUrl: created.file_url,
                            });
                          }
                        }}
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0"
                        title="Enviar fonte personalizada (.ttf, .otf, .woff, .woff2 — até 5 MB)"
                        disabled={uploadingFont}
                        onClick={() => fontInputRef.current?.click()}
                      >
                        {uploadingFont ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Upload className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
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
                  </TabsContent>

                  <TabsContent value="appearance" className="space-y-3 mt-3">
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
                  </TabsContent>

                  <TabsContent value="effects" className="space-y-3 mt-3">
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
                      <Row label="Arredondar">
                        <NumInput
                          value={selected.background.radius ?? 0}
                          min={0}
                          max={200}
                          onChange={(v) => updateLayer(selected.id, {
                            background: { ...selected.background!, radius: v }
                          })}
                          suffix="px"
                        />
                      </Row>
                      <Row label="Apenas borda">
                        <div className="flex items-center justify-end h-7">
                          <Switch
                            checked={!!selected.background.borderOnly}
                            onCheckedChange={(v) => updateLayer(selected.id, {
                              background: {
                                ...selected.background!,
                                borderOnly: v,
                                borderWidth: selected.background!.borderWidth ?? 2,
                              }
                            })}
                          />
                        </div>
                      </Row>
                      {selected.background.borderOnly && (
                        <Row label="Espessura">
                          <NumInput
                            value={selected.background.borderWidth ?? 2}
                            min={1}
                            max={20}
                            onChange={(v) => updateLayer(selected.id, {
                              background: { ...selected.background!, borderWidth: v }
                            })}
                            suffix="px"
                          />
                        </Row>
                      )}
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
                  </TabsContent>
                </Tabs>

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
