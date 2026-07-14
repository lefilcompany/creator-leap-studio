// Client-side text overlay using Canvas 2D.
// Runs entirely in the browser to keep the Edge Runtime CPU budget free.
//
// composeImageOverlay:
//   - Loads the raw base image (CORS anonymous)
//   - Draws it at the requested target dimensions (center-cropped)
//   - Renders the headline / subtexto / CTA / disclaimer according
//     to the same layout rules the previous server-side engine used
//   - Returns a base64 PNG data URL for upload

export interface ClientOverlayPayload {
  headline?: string;
  subtexto?: string;
  ctaText?: string;
  disclaimerText?: string;
  disclaimerStyle?: string;
  textPosition?: string;
  fontFamily?: string;
  fontWeight?: string;
  fontItalic?: boolean;
  fontSize?: number;
  textDesignStyle?: string;
  brandColor?: string;
  targetWidth: number;
  targetHeight: number;
  aspectRatio?: string;
}

function loadImageDirect(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = url;
  });
}

// Load an image with a CORS-safe fallback: if the direct <img crossorigin>
// path fails (some CDNs strip CORS headers), fetch the bytes and turn them
// into a blob URL. This is what lets Canvas 2D read pixels without tainting.
async function loadImage(url: string): Promise<HTMLImageElement> {
  try {
    return await loadImageDirect(url);
  } catch (err) {
    try {
      const resp = await fetch(url, { mode: "cors", cache: "no-store" });
      if (!resp.ok) throw new Error(`fetch ${resp.status}`);
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      try {
        return await loadImageDirect(blobUrl);
      } finally {
        // Revoke on next tick so the decoder has already read it.
        setTimeout(() => URL.revokeObjectURL(blobUrl), 5000);
      }
    } catch {
      throw err;
    }
  }
}

// Best-effort font preloading. If the requested family/weight isn't ready,
// Canvas silently falls back to sans-serif, which changes the visual layout.
async function ensureFontsReady(family: string, sizes: number[], weights: number[]) {
  const anyDoc: any = typeof document !== "undefined" ? document : null;
  if (!anyDoc?.fonts?.load) return;
  const specs: string[] = [];
  for (const w of weights) for (const s of sizes) specs.push(`${w} ${s}px ${family}`);
  try {
    await Promise.all(specs.map((spec) => anyDoc.fonts.load(spec)));
    if (anyDoc.fonts.ready) await anyDoc.fonts.ready;
  } catch {
    // Non-fatal — proceed with system fallback rather than failing the render.
  }
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number,
) {
  const srcRatio = img.width / img.height;
  const dstRatio = w / h;
  let sx = 0, sy = 0, sw = img.width, sh = img.height;
  if (srcRatio > dstRatio) {
    // src wider — crop sides
    sw = Math.round(img.height * dstRatio);
    sx = Math.round((img.width - sw) / 2);
  } else if (srcRatio < dstRatio) {
    sh = Math.round(img.width / dstRatio);
    sy = Math.round((img.height - sh) / 2);
  }
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
}

function wrapLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function applyShadow(ctx: CanvasRenderingContext2D, on: boolean) {
  if (on) {
    ctx.shadowColor = "rgba(0,0,0,0.7)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
  } else {
    ctx.shadowColor = "transparent";
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }
}

export async function composeImageOverlay(
  imageUrl: string,
  payload: ClientOverlayPayload,
): Promise<string> {
  const width = payload.targetWidth;
  const height = payload.targetHeight;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D não suportado");

  const img = await loadImage(imageUrl);
  drawCoverImage(ctx, img, width, height);

  const padding = Math.round(width * 0.08);
  const maxTextWidth = width - padding * 2;
  const baseFontSize = payload.fontSize || Math.round(width * 0.06);
  const headlineSize = Math.round(baseFontSize * 1.3);
  const subtitleSize = Math.round(baseFontSize * 0.72);
  const ctaSize = Math.round(baseFontSize * 0.82);
  const disclaimerSize = Math.max(12, Math.round(width * 0.015));

  const fontFamily = payload.fontFamily || "Montserrat, sans-serif";
  const color = payload.brandColor || "#FFFFFF";
  const design = payload.textDesignStyle || "clean";

  // Background treatments
  if (design === "gradient" || design === "dark") {
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.fillRect(0, 0, width, height);
  }

  // Compute starting Y
  const pos = payload.textPosition || "top";
  let startY: number;
  if (pos.includes("center") || pos === "middle") startY = Math.round(height * 0.35);
  else if (pos.includes("bottom")) startY = Math.round(height * 0.6);
  else startY = Math.round(height * 0.1);

  ctx.textBaseline = "top";
  ctx.textAlign = pos.includes("right") ? "right" : (pos.includes("center") ? "center" : "left");
  const anchorX = ctx.textAlign === "right" ? width - padding : (ctx.textAlign === "center" ? width / 2 : padding);

  let cursorY = startY;
  applyShadow(ctx, design === "clean");
  ctx.fillStyle = color;

  const drawBlock = (text: string, size: number, weight: number) => {
    ctx.font = `${payload.fontItalic ? "italic " : ""}${weight} ${size}px ${fontFamily}`;
    const lines = wrapLines(ctx, text, maxTextWidth);
    const lineHeight = Math.round(size * 1.25);
    for (const line of lines) {
      ctx.fillText(line, anchorX, cursorY);
      cursorY += lineHeight;
    }
    cursorY += Math.round(size * 0.4);
  };

  if (payload.headline?.trim()) drawBlock(payload.headline.trim(), headlineSize, 700);
  if (payload.subtexto?.trim()) drawBlock(payload.subtexto.trim(), subtitleSize, 400);
  if (payload.ctaText?.trim()) drawBlock(payload.ctaText.trim(), ctaSize, 700);

  // Disclaimer
  if (payload.disclaimerText?.trim()) {
    applyShadow(ctx, false);
    const style = payload.disclaimerStyle || "bottom_horizontal";
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    ctx.font = `400 ${disclaimerSize}px ${fontFamily}`;
    if (style === "bottom_band") {
      const bandH = disclaimerSize + 16;
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      ctx.fillRect(0, height - bandH, width, bandH);
      ctx.fillStyle = "#FFFFFF";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(payload.disclaimerText, width / 2, height - bandH / 2);
    } else if (style.includes("vertical")) {
      const isRight = style === "bottom_right_vertical";
      ctx.save();
      ctx.translate(isRight ? width - padding / 2 : padding / 2, height - padding);
      ctx.rotate(isRight ? -Math.PI / 2 : Math.PI / 2);
      ctx.textAlign = "left";
      ctx.textBaseline = "middle";
      ctx.fillText(payload.disclaimerText, 0, 0);
      ctx.restore();
    } else {
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillText(payload.disclaimerText, width / 2, height - padding / 2);
    }
  }

  return canvas.toDataURL("image/png");
}
