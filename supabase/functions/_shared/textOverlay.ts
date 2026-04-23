/**
 * Text overlay engine for generated images.
 * Uses ImageScript's native Image.renderText (TTF rasterization) to apply
 * typographic elements (headline, subtitle, CTA, disclaimer) onto images.
 *
 * Why not SVG? imagescript@1.3.0's renderSVG signature is unstable in Deno
 * Edge runtime (throws "Invalid SVG scaling mode" / RangeError on alloc).
 * renderText is the supported, deterministic API.
 */

export interface TextOverlayConfig {
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
  imageWidth: number;
  imageHeight: number;
}

export interface TextOverlayResult {
  processedData: Uint8Array;
  elementsApplied: number;
}

interface LaidOutElement {
  type: 'headline' | 'subtitle' | 'cta' | 'disclaimer';
  text: string;
  fontSize: number;
  weight: 'bold' | 'regular';
  color: number; // 0xRRGGBBAA
  align: 'left' | 'center' | 'right';
  x: number; // anchor x (depends on align)
  y: number; // top y of text block
  maxWidth: number;
  rotate?: number; // degrees
}

// ---------- Color utilities ----------
function hexToRgba(hex: string, alpha = 255): number {
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-fA-F]{6}$/.test(h)) return (255 << 24) | (255 << 16) | (255 << 8) | alpha;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return ((r & 0xff) << 24) | ((g & 0xff) << 16) | ((b & 0xff) << 8) | (alpha & 0xff);
}

function rgbaArr(r: number, g: number, b: number, a: number): number {
  return ((r & 0xff) << 24) | ((g & 0xff) << 16) | ((b & 0xff) << 8) | (a & 0xff);
}

// Pick a readable text color: if brand color is too dark/light, default to white
function chooseTextColor(brandHex: string | undefined): number {
  // Default to white for max readability over arbitrary photos
  if (!brandHex) return rgbaArr(255, 255, 255, 255);
  return hexToRgba(brandHex, 255);
}

// ---------- Font loading ----------
const fontCache = new Map<string, Uint8Array>();

async function downloadGoogleFont(family: string, weight: number): Promise<Uint8Array> {
  const key = `${family}:${weight}`;
  if (fontCache.has(key)) return fontCache.get(key)!;

  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&display=swap`;
  const cssResp = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  const css = await cssResp.text();
  const fontUrlMatch = css.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/);
  if (!fontUrlMatch) throw new Error(`Font URL not found for ${family} ${weight}`);
  const fontResp = await fetch(fontUrlMatch[1]);
  const buf = new Uint8Array(await fontResp.arrayBuffer());
  console.log(`[TextOverlay] Loaded font ${family} ${weight} (${buf.length} bytes)`);
  fontCache.set(key, buf);
  return buf;
}

// ---------- Layout ----------
function buildLayout(config: TextOverlayConfig): LaidOutElement[] {
  const { imageWidth: W, imageHeight: H } = config;
  const padding = Math.round(W * 0.06);
  const maxTextWidth = W - padding * 2;

  // Font size: the UI slider provides values in the 12-36px range, calibrated against a
  // small preview canvas (~270px wide). The actual generated image is much larger
  // (typically 1080px+), so we must scale the UI fontSize proportionally to the real
  // image width. Reference width: 270px (matches FormatPreview component size).
  const PREVIEW_REF_WIDTH = 270;
  const scale = W / PREVIEW_REF_WIDTH;
  const userFsRaw = typeof config.fontSize === 'number' && config.fontSize > 0 ? config.fontSize : null;
  const userFs = userFsRaw ? Math.round(userFsRaw * scale) : null;
  let headlineFs: number;
  let subtitleFs: number;
  let ctaFs: number;
  if (userFs) {
    // Scaled user value for headline; derive others proportionally
    headlineFs = userFs;
    subtitleFs = Math.max(12, Math.round(userFs * 0.7));
    ctaFs = Math.max(12, Math.round(userFs * 0.75));
  } else {
    const baseFs = Math.round(W * 0.045);
    headlineFs = Math.max(18, Math.round(baseFs * 1.4));
    subtitleFs = Math.max(14, Math.round(baseFs * 0.85));
    ctaFs = Math.max(14, Math.round(baseFs * 0.95));
  }
  const disclaimerFs = Math.max(11, Math.round(W * 0.014));
  console.log(`[TextOverlay] Font sizes — userFsRaw=${userFsRaw ?? 'auto'} scale=${scale.toFixed(2)} (W=${W}/ref=${PREVIEW_REF_WIDTH}) headline=${headlineFs} subtitle=${subtitleFs} cta=${ctaFs} disclaimer=${disclaimerFs}`);

  // Position — supports: top, center/middle, bottom, top-left, top-right, bottom-left, bottom-right, center-left, center-right
  const positionRaw = (config.textPosition || 'top').toLowerCase().replace(/_/g, '-');
  const isBottom = positionRaw.startsWith('bottom');
  const isMiddle = positionRaw === 'center' || positionRaw === 'middle' || positionRaw.startsWith('center');
  const isTop = !isBottom && !isMiddle;
  const isRight = positionRaw.endsWith('-right');
  const isLeft = positionRaw.endsWith('-left');

  // Horizontal alignment: explicit -left / -right wins, otherwise centered
  const align: 'left' | 'center' | 'right' = isRight ? 'right' : isLeft ? 'left' : 'center';

  // Anchor X
  let anchorX: number;
  if (align === 'right') anchorX = W - padding;
  else if (align === 'center') anchorX = Math.round(W / 2);
  else anchorX = padding;

  // Starting Y — only one element (headline) so we can position more precisely
  let currentY: number;
  if (isMiddle) currentY = Math.round(H * 0.42);
  else if (isBottom) currentY = Math.round(H * 0.78);
  else currentY = Math.round(H * 0.08);

  const color = chooseTextColor(config.brandColor);
  const elements: LaidOutElement[] = [];

  if (config.headline?.trim()) {
    elements.push({
      type: 'headline',
      text: config.headline.trim(),
      fontSize: headlineFs,
      weight: 'bold',
      color,
      align,
      x: anchorX,
      y: currentY,
      maxWidth: maxTextWidth,
    });
    const lines = estimateLines(config.headline, headlineFs, maxTextWidth);
    currentY += Math.round(headlineFs * 1.25 * lines + H * 0.025);
  }

  if (config.subtexto?.trim()) {
    elements.push({
      type: 'subtitle',
      text: config.subtexto.trim(),
      fontSize: subtitleFs,
      weight: 'regular',
      color,
      align,
      x: anchorX,
      y: currentY,
      maxWidth: maxTextWidth,
    });
    const lines = estimateLines(config.subtexto, subtitleFs, maxTextWidth);
    currentY += Math.round(subtitleFs * 1.3 * lines + H * 0.03);
  }

  if (config.ctaText?.trim()) {
    elements.push({
      type: 'cta',
      text: config.ctaText.trim().toUpperCase(),
      fontSize: ctaFs,
      weight: 'bold',
      color,
      align,
      x: anchorX,
      y: currentY,
      maxWidth: maxTextWidth,
    });
  }

  if (config.disclaimerText?.trim()) {
    const ds = config.disclaimerStyle || 'bottom_horizontal';
    if (ds === 'bottom_right_vertical' || ds === 'bottom_left_vertical') {
      const right = ds === 'bottom_right_vertical';
      elements.push({
        type: 'disclaimer',
        text: config.disclaimerText.trim(),
        fontSize: disclaimerFs,
        weight: 'regular',
        color: rgbaArr(255, 255, 255, 200),
        align: 'left',
        x: right ? W - Math.round(disclaimerFs * 1.2) : Math.round(disclaimerFs * 0.4),
        y: H - padding,
        maxWidth: H - padding * 2,
        rotate: right ? -90 : 90,
      });
    } else {
      elements.push({
        type: 'disclaimer',
        text: config.disclaimerText.trim(),
        fontSize: disclaimerFs,
        weight: 'regular',
        color: rgbaArr(255, 255, 255, 220),
        align: 'center',
        x: Math.round(W / 2),
        y: H - Math.round(disclaimerFs * 1.8),
        maxWidth: maxTextWidth,
      });
    }
  }

  return elements;
}

function estimateLines(text: string, fontSize: number, maxWidth: number): number {
  const charW = fontSize * 0.55;
  const charsPerLine = Math.max(1, Math.floor(maxWidth / charW));
  return Math.max(1, Math.ceil(text.length / charsPerLine));
}

// Word-wrap into multiple lines based on estimated character width
function wrapLines(text: string, fontSize: number, maxWidth: number): string[] {
  const charW = fontSize * 0.55;
  const charsPerLine = Math.max(1, Math.floor(maxWidth / charW));
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? cur + ' ' + w : w;
    if (test.length > charsPerLine && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// ---------- Main ----------
export async function applyTextOverlay(
  imageData: Uint8Array,
  config: TextOverlayConfig
): Promise<TextOverlayResult> {
  const { Image } = await import('https://deno.land/x/imagescript@1.3.0/mod.ts');

  const elements = buildLayout(config);
  if (elements.length === 0) {
    return { processedData: imageData, elementsApplied: 0 };
  }

  const fontFamily = config.fontFamily || 'Montserrat';
  const designStyle = (config.textDesignStyle || 'clean').toLowerCase();

  console.log(`[TextOverlay] ${elements.length} element(s), style="${designStyle}", pos="${config.textPosition || 'top'}", font="${fontFamily}"`);

  // Load both weights once
  let boldFont: Uint8Array, regularFont: Uint8Array;
  try {
    [boldFont, regularFont] = await Promise.all([
      downloadGoogleFont(fontFamily, 700),
      downloadGoogleFont(fontFamily, 400),
    ]);
  } catch (e) {
    console.warn(`[TextOverlay] Falling back to Montserrat (font load failed: ${e instanceof Error ? e.message : e})`);
    [boldFont, regularFont] = await Promise.all([
      downloadGoogleFont('Montserrat', 700),
      downloadGoogleFont('Montserrat', 400),
    ]);
  }

  let img: any;
  try {
    img = await Image.decode(imageData);
  } catch (e) {
    console.error('[TextOverlay] Failed to decode source image:', e);
    return { processedData: imageData, elementsApplied: 0 };
  }

  const W = img.width;
  const H = img.height;

  // Optional background treatments for readability
  try {
    if (designStyle === 'gradient' || designStyle === 'dark') {
      const overlay = new Image(W, H);
      overlay.fill(rgbaArr(0, 0, 0, designStyle === 'dark' ? 130 : 90));
      img.composite(overlay, 0, 0);
    } else if (designStyle === 'band') {
      const first = elements.find((e) => e.type !== 'disclaimer');
      const lastNonDisc = [...elements].reverse().find((e) => e.type !== 'disclaimer');
      if (first && lastNonDisc) {
        const top = Math.max(0, first.y - 16);
        const linesLast = wrapLines(lastNonDisc.text, lastNonDisc.fontSize, lastNonDisc.maxWidth).length;
        const bottom = Math.min(H, lastNonDisc.y + lastNonDisc.fontSize * 1.3 * linesLast + 16);
        const band = new Image(W, Math.round(bottom - top));
        band.fill(rgbaArr(0, 0, 0, 150));
        img.composite(band, 0, Math.round(top));
      }
    }
  } catch (e) {
    console.warn('[TextOverlay] background treatment failed:', e);
  }

  let applied = 0;

  for (const el of elements) {
    try {
      const fontBuf = el.weight === 'bold' ? boldFont : regularFont;
      const lines = wrapLines(el.text, el.fontSize, el.maxWidth);
      const lineHeight = Math.round(el.fontSize * 1.25);

      if (el.rotate) {
        // Render whole text on one line for vertical disclaimer
        const txt = await Image.renderText(fontBuf, el.fontSize, el.text, el.color);
        const rotated = txt.rotate(el.rotate);
        const x = Math.round(el.x - rotated.width / 2);
        const y = Math.round(el.y - rotated.height / 2);
        img.composite(rotated, Math.max(0, x), Math.max(0, y));
        applied++;
        console.log(`[TextOverlay] ${el.type}(rot ${el.rotate}°) @(${x},${y}) ${el.fontSize}px`);
        continue;
      }

      let lineY = el.y;
      for (const line of lines) {
        if (!line.trim()) { lineY += lineHeight; continue; }
        const txtImg = await Image.renderText(fontBuf, el.fontSize, line, el.color);
        let drawX: number;
        if (el.align === 'center') drawX = Math.round(el.x - txtImg.width / 2);
        else if (el.align === 'right') drawX = Math.round(el.x - txtImg.width);
        else drawX = Math.round(el.x);

        img.composite(txtImg, Math.max(0, drawX), Math.max(0, lineY));
        lineY += lineHeight;
      }
      applied++;
      console.log(`[TextOverlay] ${el.type} "${el.text.substring(0, 40)}" @(${el.x},${el.y}) ${el.fontSize}px ${el.align} lines=${lines.length}`);
    } catch (e) {
      console.error(`[TextOverlay] failed to render ${el.type}:`, e);
    }
  }

  if (applied === 0) {
    console.warn('[TextOverlay] No elements applied; returning original image');
    return { processedData: imageData, elementsApplied: 0 };
  }

  const out = await img.encode(1); // PNG
  console.log(`[TextOverlay] Done. ${applied}/${elements.length} elements, ${out.length} bytes`);
  return { processedData: new Uint8Array(out), elementsApplied: applied };
}
