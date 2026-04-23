/**
 * Free-form text layer overlay engine.
 * Renders an array of independent text layers onto an image with full
 * control over position, size, font, color, alignment, rotation,
 * background band, stroke and shadow. Coordinates are in image pixel space.
 */

export interface TextLayer {
  id: string;
  text: string;
  // Position (pixels in image coordinate space)
  x: number;          // top-left X of the layer's bounding box
  y: number;          // top-left Y of the layer's bounding box
  maxWidth: number;   // wrap width in pixels
  // Typography
  fontFamily?: string;       // Google font family name
  fontWeight?: number;       // 400 / 700
  fontItalic?: boolean;
  fontSize: number;          // pixels
  align?: 'left' | 'center' | 'right';
  lineHeight?: number;       // multiplier, default 1.25
  letterSpacing?: number;    // px (best-effort, not implemented at glyph level)
  uppercase?: boolean;
  color?: string;            // hex #RRGGBB
  opacity?: number;          // 0-1
  rotate?: number;           // degrees
  // Decorations
  stroke?: { color: string; width: number };
  shadow?: { color: string; blur: number; offsetX: number; offsetY: number };
  background?: { color: string; opacity: number; paddingX: number; paddingY: number; radius?: number };
}

export interface RenderRequest {
  imageWidth: number;
  imageHeight: number;
  layers: TextLayer[];
}

export interface RenderResult {
  processedData: Uint8Array;
  layersApplied: number;
}

// ---------- Color utils ----------
function hexToRgba(hex: string | undefined, alpha = 1): number {
  let h = (hex ?? '#ffffff').trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) h = 'ffffff';
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const a = Math.max(0, Math.min(255, Math.round(alpha * 255)));
  return ((r & 0xff) << 24) | ((g & 0xff) << 16) | ((b & 0xff) << 8) | (a & 0xff);
}

// ---------- Font loading ----------
const fontCache = new Map<string, Uint8Array>();

async function downloadGoogleFont(family: string, weight: number, italic = false): Promise<Uint8Array> {
  const key = `${family}:${weight}:${italic ? 'i' : 'n'}`;
  if (fontCache.has(key)) return fontCache.get(key)!;
  const ital = italic ? '1,' : '';
  const axes = italic ? `ital,wght@1,${weight}` : `wght@${weight}`;
  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:${axes}&display=swap`;
  const cssResp = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  const css = await cssResp.text();
  const fontUrlMatch = css.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/);
  if (!fontUrlMatch) throw new Error(`Font URL not found for ${family} ${weight}${italic ? 'i' : ''}`);
  const fontResp = await fetch(fontUrlMatch[1]);
  const buf = new Uint8Array(await fontResp.arrayBuffer());
  console.log(`[TextLayer] Loaded ${family} ${weight}${italic ? 'i' : ''} (${buf.length} bytes)`);
  fontCache.set(key, buf);
  return buf;
}

async function getFontWithFallback(family: string, weight: number, italic: boolean): Promise<Uint8Array> {
  try {
    return await downloadGoogleFont(family, weight, italic);
  } catch (_e) {
    console.warn(`[TextLayer] Falling back to Montserrat for ${family}`);
    return await downloadGoogleFont('Montserrat', weight, italic);
  }
}

// ---------- Layout ----------
// Measure-based wrapper. Uses imagescript's Image.renderText to measure exact
// pixel widths, mirroring how the browser canvas computes line breaks.
async function wrapLinesMeasured(
  ImageCtor: any,
  fontBuf: Uint8Array,
  text: string,
  fontSize: number,
  maxWidth: number,
): Promise<string[]> {
  const measure = async (s: string): Promise<number> => {
    if (!s) return 0;
    try {
      const im = await ImageCtor.renderText(fontBuf, fontSize, s, 0xffffffff);
      return im.width;
    } catch {
      return s.length * fontSize * 0.55;
    }
  };

  const paragraphs = text.split(/\n/);
  const out: string[] = [];

  for (const p of paragraphs) {
    if (!p) { out.push(''); continue; }
    const words = p.split(/\s+/).filter(Boolean);
    if (words.length === 0) { out.push(''); continue; }

    let cur = '';
    for (const w of words) {
      const test = cur ? cur + ' ' + w : w;
      const width = await measure(test);
      if (width > maxWidth && cur) {
        out.push(cur);
        cur = w;
      } else {
        cur = test;
      }
    }
    if (cur) out.push(cur);
  }
  return out.length > 0 ? out : [''];
}


// ---------- Main ----------
export async function renderTextLayers(
  imageData: Uint8Array,
  request: RenderRequest
): Promise<RenderResult> {
  const { Image } = await import('https://deno.land/x/imagescript@1.3.0/mod.ts');

  if (!request.layers?.length) {
    return { processedData: imageData, layersApplied: 0 };
  }

  let img: any;
  try {
    img = await Image.decode(imageData);
  } catch (e) {
    console.error('[TextLayer] Failed to decode source image:', e);
    return { processedData: imageData, layersApplied: 0 };
  }

  const W: number = img.width;
  const H: number = img.height;
  console.log(`[TextLayer] Image ${W}x${H}, ${request.layers.length} layer(s)`);

  // If client used a different reference resolution, scale coordinates
  const scaleX = W / Math.max(1, request.imageWidth);
  const scaleY = H / Math.max(1, request.imageHeight);
  const scale = (scaleX + scaleY) / 2;

  let applied = 0;

  for (const layer of request.layers) {
    if (!layer.text?.trim()) continue;
    try {
      const family = layer.fontFamily || 'Montserrat';
      const weight = layer.fontWeight || 400;
      const italic = !!layer.fontItalic;
      const fontBuf = await getFontWithFallback(family, weight, italic);

      const fontSize = Math.max(8, Math.round(layer.fontSize * scale));
      const maxWidthPx = Math.max(20, Math.round(layer.maxWidth * scaleX));
      const lineHeightMul = layer.lineHeight ?? 1.25;
      const lineHeight = Math.round(fontSize * lineHeightMul);
      const align = layer.align || 'left';
      const opacity = layer.opacity ?? 1;
      const color = hexToRgba(layer.color, opacity);

      let displayText = layer.text;
      if (layer.uppercase) displayText = displayText.toUpperCase();

      const lines = await wrapLinesMeasured(Image, fontBuf, displayText, fontSize, maxWidthPx);

      // Render each line into its own image first to measure widths
      const lineImages: any[] = [];
      for (const line of lines) {
        if (!line) {
          lineImages.push(null);
          continue;
        }
        const li = await Image.renderText(fontBuf, fontSize, line, color);
        lineImages.push(li);
      }
      // The text "block" matches the editor's div: width = maxWidthPx.
      // Lines are aligned (left/center/right) inside this block — exactly
      // like CSS text-align in the preview.
      const blockWidth = maxWidthPx;
      const blockHeight = lineHeight * lines.length;

      // Build a container with optional background band + padding.
      // Reserve bleed space for stroke/shadow so the first/last glyphs
      // don't get clipped, but DO NOT shift the text block — we'll
      // compensate by offsetting the final composite position.
      const padX = Math.round((layer.background?.paddingX ?? 0) * scale);
      const padY = Math.round((layer.background?.paddingY ?? 0) * scale);
      const strokePad = layer.stroke && layer.stroke.width > 0
        ? Math.max(1, Math.round(layer.stroke.width * scale))
        : 0;
      const shadowBlur = layer.shadow ? Math.max(0, Math.round(layer.shadow.blur * scale)) : 0;
      const shadowOffsetX = layer.shadow ? Math.round(layer.shadow.offsetX * scale) : 0;
      const shadowOffsetY = layer.shadow ? Math.round(layer.shadow.offsetY * scale) : 0;
      const effectLeftPad = Math.max(2, strokePad, shadowBlur + Math.max(0, -shadowOffsetX));
      const effectRightPad = Math.max(2, strokePad, shadowBlur + Math.max(0, shadowOffsetX));
      const effectTopPad = Math.max(2, strokePad, shadowBlur + Math.max(0, -shadowOffsetY));
      const effectBottomPad = Math.max(2, strokePad, shadowBlur + Math.max(0, shadowOffsetY));
      // The text block starts at (effectLeftPad + padX, effectTopPad + padY)
      // inside the container. Final composite below subtracts the bleed
      // so the block's top-left lands exactly at (layer.x, layer.y).
      const textOffsetX = effectLeftPad + padX;
      const textOffsetY = effectTopPad + padY;
      const containerW = Math.max(1, blockWidth + padX * 2 + effectLeftPad + effectRightPad);
      const containerH = Math.max(1, blockHeight + padY * 2 + effectTopPad + effectBottomPad);
      const container = new Image(containerW, containerH);

      if (layer.background && layer.background.opacity > 0) {
        container.fill(hexToRgba(layer.background.color, layer.background.opacity));
      }

      // Draw shadow + stroke + main text
      let lineY = textOffsetY;
      for (let i = 0; i < lines.length; i++) {
        const li = lineImages[i];
        if (!li) { lineY += lineHeight; continue; }
        // Align inside the block of width = blockWidth (= maxWidthPx).
        let drawX: number;
        if (align === 'center') drawX = textOffsetX + Math.round((blockWidth - li.width) / 2);
        else if (align === 'right') drawX = textOffsetX + (blockWidth - li.width);
        else drawX = textOffsetX;

        // Shadow (rendered as offset blurred copy approximation: just offset)
        if (layer.shadow && layer.shadow.color) {
          const shadowImg = await Image.renderText(fontBuf, fontSize, lines[i], hexToRgba(layer.shadow.color, opacity));
          const sx = drawX + Math.round(layer.shadow.offsetX * scale);
          const sy = lineY + Math.round(layer.shadow.offsetY * scale);
          // Best-effort blur via repeated offsets
          const blur = Math.max(0, Math.round(layer.shadow.blur * scale));
          for (let bx = -blur; bx <= blur; bx += Math.max(1, blur)) {
            for (let by = -blur; by <= blur; by += Math.max(1, blur)) {
              container.composite(shadowImg, sx + bx, sy + by);
            }
          }
        }

        // Stroke (render text in stroke color and offset 8 directions)
        if (layer.stroke && layer.stroke.width > 0) {
          const sw = Math.max(1, Math.round(layer.stroke.width * scale));
          const strokeImg = await Image.renderText(fontBuf, fontSize, lines[i], hexToRgba(layer.stroke.color, opacity));
          for (let dx = -sw; dx <= sw; dx++) {
            for (let dy = -sw; dy <= sw; dy++) {
              if (dx === 0 && dy === 0) continue;
              container.composite(strokeImg, drawX + dx, lineY + dy);
            }
          }
        }

        container.composite(li, drawX, lineY);
        lineY += lineHeight;
      }

      // Rotate container if requested. imagescript's rotate() spins around
      // the container CENTER and expands the canvas. The editor uses CSS
      // `transform-origin: top left`, so to mirror it we compute where the
      // text-block's top-left point ends up after rotation and offset the
      // composite so that point lands exactly at (layer.x, layer.y).
      const rotDeg = layer.rotate || 0;
      const finalImg = rotDeg ? container.rotate(rotDeg) : container;

      // Original (unrotated) top-left of the text block, relative to
      // container center.
      const cx = containerW / 2;
      const cy = containerH / 2;
      const dxC = textOffsetX - cx;
      const dyC = textOffsetY - cy;

      const theta = (rotDeg * Math.PI) / 180;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);
      // Rotated position relative to the new (expanded) image center.
      const newDx = dxC * cosT - dyC * sinT;
      const newDy = dxC * sinT + dyC * cosT;
      const blockTLx = finalImg.width / 2 + newDx;
      const blockTLy = finalImg.height / 2 + newDy;

      // Anchor the rotated text-block's top-left at (layer.x, layer.y).
      const px = Math.round(layer.x * scaleX - blockTLx);
      const py = Math.round(layer.y * scaleY - blockTLy);

      img.composite(finalImg, px, py);
      applied++;
      console.log(`[TextLayer] Applied "${layer.text.substring(0, 40)}" @(${px},${py}) ${fontSize}px ${family}/${weight}`);
    } catch (e) {
      console.error('[TextLayer] failed to render layer', layer.id, e);
    }
  }

  if (applied === 0) {
    console.warn('[TextLayer] No layers applied');
    return { processedData: imageData, layersApplied: 0 };
  }

  const out = await img.encode(1);
  console.log(`[TextLayer] Done. ${applied}/${request.layers.length} layers, ${out.length} bytes`);
  return { processedData: new Uint8Array(out), layersApplied: applied };
}
