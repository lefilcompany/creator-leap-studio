import { useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import type { TextLayer } from "@/components/TextOverlayEditor";
import { ensureFontLoaded } from "@/hooks/useCustomFonts";

type Props = {
  /** Layers from a template or current editor state. The first layer drives the preview. */
  layers: TextLayer[] | undefined | null;
  /** Optional sample text override. */
  sample?: string;
  /** Visual size — controls the checkered canvas height. */
  size?: "xs" | "sm" | "md";
  /** Show small chips listing the active effects (stroke, shadow, background). */
  showEffectChips?: boolean;
  className?: string;
  /** Optional caption shown above the preview ("Antes", "Depois", etc.). */
  label?: string;
};

const HEIGHTS: Record<NonNullable<Props["size"]>, string> = {
  xs: "h-12",
  sm: "h-16",
  md: "h-24",
};

/**
 * Compact, live preview of a text-overlay style — renders the FIRST layer's
 * typography, color, opacity and effects so users can compare quickly without
 * applying it to the canvas.
 */
export default function TextStylePreview({
  layers,
  sample,
  size = "sm",
  showEffectChips = false,
  className,
  label,
}: Props) {
  const layer = layers && layers.length > 0 ? layers[0] : null;

  // Pre-load custom fonts referenced by the template so the preview is faithful.
  useEffect(() => {
    if (!layer) return;
    if ((layer as any).customFontUrl && layer.fontFamily) {
      ensureFontLoaded(layer.fontFamily, (layer as any).customFontUrl);
    }
  }, [layer]);

  const style = useMemo(() => {
    if (!layer) return {};
    const shadowParts: string[] = [];
    if (layer.shadow && layer.shadow.blur >= 0) {
      shadowParts.push(
        `${layer.shadow.offsetX}px ${layer.shadow.offsetY}px ${layer.shadow.blur}px ${layer.shadow.color}`
      );
    }
    if (layer.stroke && layer.stroke.width > 0) {
      // Approximate stroke via layered text-shadows in 8 directions.
      const w = Math.max(0.5, layer.stroke.width / 2);
      const c = layer.stroke.color;
      for (const [dx, dy] of [
        [-w, 0], [w, 0], [0, -w], [0, w],
        [-w, -w], [w, -w], [-w, w], [w, w],
      ] as const) {
        shadowParts.push(`${dx}px ${dy}px 0 ${c}`);
      }
    }
    return {
      fontFamily: `"${layer.fontFamily}", system-ui, sans-serif`,
      fontWeight: layer.fontWeight,
      fontStyle: layer.fontItalic ? "italic" : "normal",
      color: layer.color,
      opacity: layer.opacity,
      textTransform: layer.uppercase ? ("uppercase" as const) : ("none" as const),
      lineHeight: layer.lineHeight,
      letterSpacing: "-0.01em",
      textShadow: shadowParts.length ? shadowParts.join(", ") : undefined,
      transform: layer.rotate ? `rotate(${layer.rotate}deg)` : undefined,
    } as React.CSSProperties;
  }, [layer]);

  const bgStyle = useMemo<React.CSSProperties | undefined>(() => {
    if (!layer?.background) return undefined;
    const b = layer.background;
    return {
      backgroundColor: b.borderOnly ? "transparent" : b.color,
      opacity: b.opacity,
      borderColor: b.color,
      borderWidth: b.borderOnly ? (b.borderWidth ?? 1) : 0,
      borderStyle: "solid",
      borderRadius: b.radius ?? 0,
      paddingLeft: Math.min(12, b.paddingX || 0),
      paddingRight: Math.min(12, b.paddingX || 0),
      paddingTop: Math.min(8, b.paddingY || 0),
      paddingBottom: Math.min(8, b.paddingY || 0),
    };
  }, [layer]);

  const text = sample ?? layer?.text ?? "Aa";
  const previewFontSize = size === "xs" ? 13 : size === "sm" ? 16 : 22;

  return (
    <div className={cn("min-w-0", className)}>
      {label && (
        <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-muted-foreground mb-1">
          {label}
        </div>
      )}
      <div
        className={cn(
          "relative w-full rounded-md overflow-hidden border border-border/40",
          "bg-[conic-gradient(at_25%_25%,hsl(var(--muted))_25%,hsl(var(--background))_25%_50%,hsl(var(--muted))_50%_75%,hsl(var(--background))_75%)] [background-size:14px_14px]",
          HEIGHTS[size]
        )}
        aria-label="Pré-visualização do estilo"
      >
        {!layer ? (
          <div className="absolute inset-0 flex items-center justify-center text-[11px] text-muted-foreground">
            Sem estilo
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center px-2">
            <span
              style={{
                ...bgStyle,
                display: "inline-block",
                maxWidth: "100%",
              }}
            >
              <span
                style={{ ...style, fontSize: previewFontSize, whiteSpace: "nowrap" }}
                className="block truncate"
              >
                {text || "Aa"}
              </span>
            </span>
          </div>
        )}
      </div>
      {showEffectChips && layer && (
        <div className="flex flex-wrap items-center gap-1 mt-1.5 text-[10px] text-muted-foreground">
          <span
            className="h-3 w-3 rounded-sm border border-border/60 shrink-0"
            style={{ backgroundColor: layer.color }}
            title={`Cor: ${layer.color}`}
          />
          <span className="font-medium truncate max-w-[120px]" title={layer.fontFamily}>
            {layer.fontFamily}
          </span>
          <span className="tabular-nums">· {layer.fontWeight}</span>
          <span className="tabular-nums">· {Math.round(layer.opacity * 100)}%</span>
          {layer.stroke && layer.stroke.width > 0 && (
            <span className="px-1 rounded bg-muted">contorno</span>
          )}
          {layer.shadow && layer.shadow.blur > 0 && (
            <span className="px-1 rounded bg-muted">sombra</span>
          )}
          {layer.background && (
            <span className="px-1 rounded bg-muted">
              {layer.background.borderOnly ? "borda" : "fundo"}
            </span>
          )}
          {layers && layers.length > 1 && (
            <span className="ml-auto text-[10px]">+{layers.length - 1}</span>
          )}
        </div>
      )}
    </div>
  );
}
