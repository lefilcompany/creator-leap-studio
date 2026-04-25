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
  /** When provided, the server downloads the font file directly from this URL
   * instead of resolving via Google Fonts. Used for user-uploaded fonts. */
  customFontUrl?: string;
  // Decorations
  stroke?: { color: string; width: number };
  shadow?: { color: string; blur: number; offsetX: number; offsetY: number };
  background?: { color: string; opacity: number; paddingX: number; paddingY: number; radius?: number; borderOnly?: boolean; borderWidth?: number };
}

export interface RenderRequest {
  imageWidth: number;
  imageHeight: number;
  layers: TextLayer[];
}

export interface LayerRenderReport {
  layerId: string;
  text: string;
  // Inputs as received (already in image px coordinate space)
  input: {
    x: number;
    y: number;
    maxWidth: number;
    fontSize: number;
    align: 'left' | 'center' | 'right';
    rotate: number;
    fontFamily: string;
    fontWeight: number;
    italic: boolean;
    uppercase: boolean;
    hasStroke: boolean;
    strokeWidth?: number;
    hasShadow: boolean;
    shadowOffsetX?: number;
    shadowOffsetY?: number;
    shadowBlur?: number;
    hasBackground: boolean;
  };
  // Resolved scaling (canvas → final image)
  scale: { x: number; y: number; avg: number };
  // Computed pixel-space metrics
  computed: {
    fontSizePx: number;
    maxWidthPx: number;
    lineHeightPx: number;
    lineCount: number;
    blockWidth: number;
    blockHeight: number;
    padX: number;
    padY: number;
    effectLeftPad: number;
    effectRightPad: number;
    effectTopPad: number;
    effectBottomPad: number;
    textOffsetX: number;
    textOffsetY: number;
    containerW: number;
    containerH: number;
    finalW: number;
    finalH: number;
    px: number;
    py: number;
  };
  // Parity check vs editor preview (CSS WebkitTextStroke + textShadow)
  parity: {
    expectedBleedX: number;
    expectedBleedY: number;
    actualBleedX: number;
    actualBleedY: number;
    deltaX: number;
    deltaY: number;
    warning: boolean;
  };
  applied: boolean;
  error?: string;
}

export interface RenderResult {
  processedData: Uint8Array;
  layersApplied: number;
  reports: LayerRenderReport[];
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

async function downloadCustomFont(family: string, url: string): Promise<Uint8Array> {
  const key = `custom:${url}`;
  if (fontCache.has(key)) return fontCache.get(key)!;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Custom font fetch failed (${resp.status}) for ${url}`);
  const buf = new Uint8Array(await resp.arrayBuffer());
  console.log(`[TextLayer] Loaded custom font ${family} from ${url} (${buf.length} bytes)`);
  fontCache.set(key, buf);
  return buf;
}

async function getFontWithFallback(
  family: string,
  weight: number,
  italic: boolean,
  customUrl?: string,
): Promise<Uint8Array> {
  if (customUrl) {
    try {
      return await downloadCustomFont(family, customUrl);
    } catch (err) {
      console.warn(`[TextLayer] Custom font failed (${family}), falling back to Montserrat`, err);
      return await downloadGoogleFont('Montserrat', weight, italic);
    }
  }
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
    return { processedData: imageData, layersApplied: 0, reports: [] };
  }

  let img: any;
  try {
    img = await Image.decode(imageData);
  } catch (e) {
    console.error('[TextLayer] Failed to decode source image:', e);
    return { processedData: imageData, layersApplied: 0, reports: [] };
  }

  const W: number = img.width;
  const H: number = img.height;
  console.log(`[TextLayer] Image ${W}x${H}, ${request.layers.length} layer(s)`);

  // If client used a different reference resolution, scale coordinates
  const scaleX = W / Math.max(1, request.imageWidth);
  const scaleY = H / Math.max(1, request.imageHeight);
  const scale = (scaleX + scaleY) / 2;

  let applied = 0;
  const reports: LayerRenderReport[] = [];

  for (const layer of request.layers) {
    if (!layer.text?.trim()) continue;
    try {
      const family = layer.fontFamily || 'Montserrat';
      const weight = layer.fontWeight || 400;
      const italic = !!layer.fontItalic;
      const fontBuf = await getFontWithFallback(family, weight, italic, layer.customFontUrl);

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
      const blockWidth = maxWidthPx;
      const blockHeight = lineHeight * lines.length;

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

      // -------- Preview/Server parity validation --------
      const PARITY_TOL_PX = 1;
      const expectedStrokeBleed = layer.stroke && layer.stroke.width > 0
        ? layer.stroke.width * scale
        : 0;
      const expectedShadowBleedX = layer.shadow
        ? Math.abs(layer.shadow.offsetX) * scale + layer.shadow.blur * scale
        : 0;
      const expectedShadowBleedY = layer.shadow
        ? Math.abs(layer.shadow.offsetY) * scale + layer.shadow.blur * scale
        : 0;
      const actualBleedX = Math.max(effectLeftPad, effectRightPad);
      const actualBleedY = Math.max(effectTopPad, effectBottomPad);
      const expectedBleedX = Math.max(expectedStrokeBleed, expectedShadowBleedX);
      const expectedBleedY = Math.max(expectedStrokeBleed, expectedShadowBleedY);
      const dxBleed = Math.abs(actualBleedX - expectedBleedX);
      const dyBleed = Math.abs(actualBleedY - expectedBleedY);
      const parityWarn = dxBleed > Math.max(PARITY_TOL_PX, 2) || dyBleed > Math.max(PARITY_TOL_PX, 2);
      if (parityWarn) {
        console.warn(
          `[TextLayer][PARITY] Layer "${layer.id}" effect bleed differs from preview: ` +
          `actual=(${actualBleedX},${actualBleedY}) expected=(${expectedBleedX.toFixed(2)},${expectedBleedY.toFixed(2)}) ` +
          `Δ=(${dxBleed.toFixed(2)},${dyBleed.toFixed(2)}) ` +
          `stroke=${JSON.stringify(layer.stroke)} shadow=${JSON.stringify(layer.shadow)}`,
        );
      }

      const textOffsetX = effectLeftPad + padX;
      const textOffsetY = effectTopPad + padY;
      const containerW = Math.max(1, blockWidth + padX * 2 + effectLeftPad + effectRightPad);
      const containerH = Math.max(1, blockHeight + padY * 2 + effectTopPad + effectBottomPad);
      const container = new Image(containerW, containerH);

      if (layer.background && layer.background.opacity > 0) {
        const bgColor = hexToRgba(layer.background.color, layer.background.opacity);
        const radius = Math.max(0, Math.round((layer.background.radius ?? 0) * scale));
        const borderOnly = !!layer.background.borderOnly;
        const borderW = borderOnly ? Math.max(1, Math.round((layer.background.borderWidth ?? 2) * scale)) : 0;
        const w = container.width;
        const h = container.height;
        const r = Math.min(radius, Math.floor(Math.min(w, h) / 2));

        const insideRounded = (x: number, y: number): boolean => {
          if (r <= 0) return x >= 0 && y >= 0 && x < w && y < h;
          // Corner regions
          if (x < r && y < r) {
            const dx = r - x - 0.5, dy = r - y - 0.5;
            return dx * dx + dy * dy <= r * r;
          }
          if (x >= w - r && y < r) {
            const dx = x - (w - r) + 0.5, dy = r - y - 0.5;
            return dx * dx + dy * dy <= r * r;
          }
          if (x < r && y >= h - r) {
            const dx = r - x - 0.5, dy = y - (h - r) + 0.5;
            return dx * dx + dy * dy <= r * r;
          }
          if (x >= w - r && y >= h - r) {
            const dx = x - (w - r) + 0.5, dy = y - (h - r) + 0.5;
            return dx * dx + dy * dy <= r * r;
          }
          return true;
        };

        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            if (!insideRounded(x, y)) continue;
            if (borderOnly) {
              // Only paint if pixel is within borderW of an outer edge
              // i.e. not inside the inner rounded rect (shrunk by borderW)
              const ix = x - borderW;
              const iy = y - borderW;
              const iw = w - borderW * 2;
              const ih = h - borderW * 2;
              const ir = Math.max(0, r - borderW);
              if (ix >= 0 && iy >= 0 && ix < iw && iy < ih) {
                // check inner rounded
                let insideInner = true;
                if (ir > 0) {
                  if (ix < ir && iy < ir) {
                    const dx = ir - ix - 0.5, dy = ir - iy - 0.5;
                    insideInner = dx * dx + dy * dy <= ir * ir;
                  } else if (ix >= iw - ir && iy < ir) {
                    const dx = ix - (iw - ir) + 0.5, dy = ir - iy - 0.5;
                    insideInner = dx * dx + dy * dy <= ir * ir;
                  } else if (ix < ir && iy >= ih - ir) {
                    const dx = ir - ix - 0.5, dy = iy - (ih - ir) + 0.5;
                    insideInner = dx * dx + dy * dy <= ir * ir;
                  } else if (ix >= iw - ir && iy >= ih - ir) {
                    const dx = ix - (iw - ir) + 0.5, dy = iy - (ih - ir) + 0.5;
                    insideInner = dx * dx + dy * dy <= ir * ir;
                  }
                }
                if (insideInner) continue;
              }
            }
            container.setPixelAt(x, y, bgColor);
          }
        }
      }

      let lineY = textOffsetY;
      for (let i = 0; i < lines.length; i++) {
        const li = lineImages[i];
        if (!li) { lineY += lineHeight; continue; }
        let drawX: number;
        if (align === 'center') drawX = textOffsetX + Math.round((blockWidth - li.width) / 2);
        else if (align === 'right') drawX = textOffsetX + (blockWidth - li.width);
        else drawX = textOffsetX;

        if (layer.shadow && layer.shadow.color) {
          const shadowImg = await Image.renderText(fontBuf, fontSize, lines[i], hexToRgba(layer.shadow.color, opacity));
          const sx = drawX + Math.round(layer.shadow.offsetX * scale);
          const sy = lineY + Math.round(layer.shadow.offsetY * scale);
          const blur = Math.max(0, Math.round(layer.shadow.blur * scale));
          for (let bx = -blur; bx <= blur; bx += Math.max(1, blur)) {
            for (let by = -blur; by <= blur; by += Math.max(1, blur)) {
              container.composite(shadowImg, sx + bx, sy + by);
            }
          }
        }

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

      const rotDeg = layer.rotate || 0;
      const finalImg = rotDeg ? container.rotate(rotDeg) : container;

      const cx = containerW / 2;
      const cy = containerH / 2;
      const dxC = textOffsetX - cx;
      const dyC = textOffsetY - cy;

      const theta = (rotDeg * Math.PI) / 180;
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);
      const newDx = dxC * cosT - dyC * sinT;
      const newDy = dxC * sinT + dyC * cosT;
      const blockTLx = finalImg.width / 2 + newDx;
      const blockTLy = finalImg.height / 2 + newDy;

      const px = Math.round(layer.x * scaleX - blockTLx);
      const py = Math.round(layer.y * scaleY - blockTLy);

      img.composite(finalImg, px, py);
      applied++;
      console.log(`[TextLayer] Applied "${layer.text.substring(0, 40)}" @(${px},${py}) ${fontSize}px ${family}/${weight}`);

      reports.push({
        layerId: layer.id,
        text: layer.text.substring(0, 80),
        input: {
          x: layer.x, y: layer.y, maxWidth: layer.maxWidth,
          fontSize: layer.fontSize, align, rotate: rotDeg,
          fontFamily: family, fontWeight: weight, italic,
          uppercase: !!layer.uppercase,
          hasStroke: !!(layer.stroke && layer.stroke.width > 0),
          strokeWidth: layer.stroke?.width,
          hasShadow: !!layer.shadow,
          shadowOffsetX: layer.shadow?.offsetX,
          shadowOffsetY: layer.shadow?.offsetY,
          shadowBlur: layer.shadow?.blur,
          hasBackground: !!(layer.background && layer.background.opacity > 0),
        },
        scale: { x: scaleX, y: scaleY, avg: scale },
        computed: {
          fontSizePx: fontSize,
          maxWidthPx,
          lineHeightPx: lineHeight,
          lineCount: lines.length,
          blockWidth, blockHeight,
          padX, padY,
          effectLeftPad, effectRightPad, effectTopPad, effectBottomPad,
          textOffsetX, textOffsetY,
          containerW, containerH,
          finalW: finalImg.width, finalH: finalImg.height,
          px, py,
        },
        parity: {
          expectedBleedX: Number(expectedBleedX.toFixed(2)),
          expectedBleedY: Number(expectedBleedY.toFixed(2)),
          actualBleedX, actualBleedY,
          deltaX: Number(dxBleed.toFixed(2)),
          deltaY: Number(dyBleed.toFixed(2)),
          warning: parityWarn,
        },
        applied: true,
      });
    } catch (e) {
      console.error('[TextLayer] failed to render layer', layer.id, e);
      reports.push({
        layerId: layer.id,
        text: (layer.text || '').substring(0, 80),
        input: {
          x: layer.x, y: layer.y, maxWidth: layer.maxWidth,
          fontSize: layer.fontSize, align: layer.align || 'left',
          rotate: layer.rotate || 0,
          fontFamily: layer.fontFamily || 'Montserrat',
          fontWeight: layer.fontWeight || 400,
          italic: !!layer.fontItalic,
          uppercase: !!layer.uppercase,
          hasStroke: !!(layer.stroke && layer.stroke.width > 0),
          strokeWidth: layer.stroke?.width,
          hasShadow: !!layer.shadow,
          shadowOffsetX: layer.shadow?.offsetX,
          shadowOffsetY: layer.shadow?.offsetY,
          shadowBlur: layer.shadow?.blur,
          hasBackground: !!(layer.background && layer.background.opacity > 0),
        },
        scale: { x: scaleX, y: scaleY, avg: scale },
        computed: {
          fontSizePx: 0, maxWidthPx: 0, lineHeightPx: 0, lineCount: 0,
          blockWidth: 0, blockHeight: 0, padX: 0, padY: 0,
          effectLeftPad: 0, effectRightPad: 0, effectTopPad: 0, effectBottomPad: 0,
          textOffsetX: 0, textOffsetY: 0,
          containerW: 0, containerH: 0, finalW: 0, finalH: 0, px: 0, py: 0,
        },
        parity: {
          expectedBleedX: 0, expectedBleedY: 0,
          actualBleedX: 0, actualBleedY: 0,
          deltaX: 0, deltaY: 0, warning: false,
        },
        applied: false,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  if (applied === 0) {
    console.warn('[TextLayer] No layers applied');
    return { processedData: imageData, layersApplied: 0, reports };
  }

  const out = await img.encode(1);
  console.log(`[TextLayer] Done. ${applied}/${request.layers.length} layers, ${out.length} bytes`);
  console.log(`[TextLayer][REPORT] ${JSON.stringify(reports)}`);
  return { processedData: new Uint8Array(out), layersApplied: applied, reports };
}
