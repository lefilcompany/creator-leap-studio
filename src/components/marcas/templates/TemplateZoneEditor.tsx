import { useRef, useState, useEffect } from "react";
import { Rnd } from "react-rnd";
import { cn } from "@/lib/utils";
import type { TemplateTextZone, TemplateLogoSlot, TemplateBBox } from "@/types/template";

interface TemplateZoneEditorProps {
  imageUrl: string;
  imageWidth: number;
  imageHeight: number;
  zones: TemplateTextZone[];
  logoSlot: TemplateLogoSlot | null;
  selectedId: string | "logo" | null;
  onSelect: (id: string | "logo" | null) => void;
  onZoneChange: (id: string, bbox: TemplateBBox) => void;
  onLogoChange: (bbox: TemplateBBox) => void;
}

export function TemplateZoneEditor({
  imageUrl,
  imageWidth,
  imageHeight,
  zones,
  logoSlot,
  selectedId,
  onSelect,
  onZoneChange,
  onLogoChange,
}: TemplateZoneEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const ratio = imageHeight / imageWidth;
      const w = el.clientWidth;
      setSize({ w, h: w * ratio });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [imageWidth, imageHeight]);

  const toPx = (b: TemplateBBox) => ({
    x: b.x * size.w,
    y: b.y * size.h,
    width: b.w * size.w,
    height: b.h * size.h,
  });
  const toBbox = (px: { x: number; y: number; width: number; height: number }): TemplateBBox => ({
    x: Math.max(0, Math.min(1, px.x / size.w)),
    y: Math.max(0, Math.min(1, px.y / size.h)),
    w: Math.max(0.02, Math.min(1, px.width / size.w)),
    h: Math.max(0.02, Math.min(1, px.height / size.h)),
  });

  return (
    <div
      ref={containerRef}
      className="relative w-full bg-muted/30 rounded-2xl overflow-hidden border border-border/20"
      style={{ height: size.h || "auto", aspectRatio: `${imageWidth} / ${imageHeight}` }}
      onClick={() => onSelect(null)}
    >
      {/* base image */}
      <img
        src={imageUrl}
        alt="Template"
        className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
        draggable={false}
      />

      {size.w > 0 && zones.map((z) => {
        const px = toPx(z.bbox);
        const isSel = selectedId === z.id;
        return (
          <Rnd
            key={z.id}
            size={{ width: px.width, height: px.height }}
            position={{ x: px.x, y: px.y }}
            bounds="parent"
            onDragStop={(_e, d) =>
              onZoneChange(z.id, toBbox({ x: d.x, y: d.y, width: px.width, height: px.height }))
            }
            onResizeStop={(_e, _dir, ref, _delta, pos) =>
              onZoneChange(
                z.id,
                toBbox({ x: pos.x, y: pos.y, width: parseFloat(ref.style.width), height: parseFloat(ref.style.height) }),
              )
            }
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onSelect(z.id);
            }}
            className={cn(
              "border-2 rounded-md flex items-center justify-center text-xs font-medium",
              isSel
                ? "border-primary bg-primary/20 text-primary"
                : "border-primary/60 bg-primary/10 hover:bg-primary/15 text-primary/80",
            )}
          >
            <span className="px-1 truncate">{z.label}</span>
          </Rnd>
        );
      })}

      {size.w > 0 && logoSlot && (() => {
        const px = toPx(logoSlot.bbox);
        const isSel = selectedId === "logo";
        return (
          <Rnd
            size={{ width: px.width, height: px.height }}
            position={{ x: px.x, y: px.y }}
            bounds="parent"
            onDragStop={(_e, d) =>
              onLogoChange(toBbox({ x: d.x, y: d.y, width: px.width, height: px.height }))
            }
            onResizeStop={(_e, _dir, ref, _delta, pos) =>
              onLogoChange(
                toBbox({ x: pos.x, y: pos.y, width: parseFloat(ref.style.width), height: parseFloat(ref.style.height) }),
              )
            }
            onClick={(e: React.MouseEvent) => {
              e.stopPropagation();
              onSelect("logo");
            }}
            className={cn(
              "border-2 border-dashed rounded-md flex items-center justify-center text-xs font-medium",
              isSel ? "border-accent bg-accent/20 text-accent" : "border-accent/70 bg-accent/10 text-accent/80",
            )}
          >
            LOGO
          </Rnd>
        );
      })()}
    </div>
  );
}
