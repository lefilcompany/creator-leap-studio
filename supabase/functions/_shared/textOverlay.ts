/**
 * Text Overlay Engine - Renders text on images using real typographic rendering
 * via ImageScript's font engine (fontdue WASM) instead of relying on AI models.
 * 
 * This produces crisp, anti-aliased, pixel-perfect text with correct spelling,
 * proper accents, and professional typographic quality.
 */

// @ts-ignore - ImageScript types
const { Image } = await import('https://deno.land/x/imagescript@1.3.0/mod.ts');

// =====================================
// TYPES
// =====================================

export interface TextElement {
  text: string;
  position: 'top' | 'center' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  fontSize: number;
  fontFamily?: string;
  fontWeight?: string;
  color: number; // RGBA as 32-bit number
  role: 'headline' | 'cta' | 'disclaimer' | 'subtitle';
}

export interface TextOverlayConfig {
  elements: TextElement[];
  designStyle: string;
  brandColor?: string;
  imageWidth: number;
  imageHeight: number;
}

// =====================================
// FONT CACHE & DOWNLOAD
// =====================================

const fontCache = new Map<string, Uint8Array>();

// Google Font name mapping
const FONT_URL_MAP: Record<string, string> = {
  'Montserrat': 'montserrat',
  'Playfair Display': 'playfairdisplay',
  'Roboto': 'roboto',
  'Open Sans': 'opensans',
  'Lato': 'lato',
  'Poppins': 'poppins',
  'Oswald': 'oswald',
  'Raleway': 'raleway',
  'Inter': 'inter',
  'Bebas Neue': 'bebasneue',
  'Dancing Script': 'dancingscript',
  'Pacifico': 'pacifico',
  'Caveat': 'caveat',
};

async function downloadFont(fontFamily: string, weight: string = '700'): Promise<Uint8Array> {
  const cacheKey = `${fontFamily}-${weight}`;
  if (fontCache.has(cacheKey)) return fontCache.get(cacheKey)!;

  try {
    // Use Google Fonts CSS API with old user-agent to get TTF
    const googleName = encodeURIComponent(fontFamily);
    const cssUrl = `https://fonts.googleapis.com/css2?family=${googleName}:wght@${weight}`;

    const cssResp = await fetch(cssUrl, {
      headers: { 'User-Agent': 'Mozilla/4.0 (compatible; MSIE 6.0; Windows NT 5.1)' }
    });

    if (!cssResp.ok) throw new Error(`CSS fetch failed: ${cssResp.status}`);
    const css = await cssResp.text();

    // Extract TTF URL
    const urlMatch = css.match(/url\(([^)]+\.ttf[^)]*)\)/);
    if (!urlMatch) throw new Error(`No TTF URL found for ${fontFamily}`);

    const fontResp = await fetch(urlMatch[1]);
    if (!fontResp.ok) throw new Error(`Font download failed: ${fontResp.status}`);

    const fontData = new Uint8Array(await fontResp.arrayBuffer());
    fontCache.set(cacheKey, fontData);
    console.log(`[TextOverlay] Downloaded font: ${fontFamily} ${weight} (${fontData.length} bytes)`);
    return fontData;
  } catch (error) {
    console.warn(`[TextOverlay] Failed to download "${fontFamily}": ${error}`);

    // Fallback to Roboto
    if (fontFamily !== 'Roboto') {
      return downloadFont('Roboto', weight);
    }

    throw new Error(`Cannot load any font`);
  }
}

// =====================================
// COLOR UTILITIES
// =====================================

function hexToRGBA(hex: string, alpha: number = 255): number {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return ((r & 0xFF) << 24) | ((g & 0xFF) << 16) | ((b & 0xFF) << 8) | (alpha & 0xFF);
}

/**
 * Sample average color from an image region to determine best text color.
 */
function sampleRegionBrightness(img: any, x: number, y: number, w: number, h: number): number {
  let totalLum = 0;
  let count = 0;
  const step = Math.max(1, Math.floor(Math.min(w, h) / 10));

  for (let sy = y; sy < y + h && sy < img.height; sy += step) {
    for (let sx = x; sx < x + w && sx < img.width; sx += step) {
      if (sx < 1 || sy < 1) continue;
      const pixel = img.getPixelAt(sx, sy);
      const r = (pixel >> 24) & 0xFF;
      const g = (pixel >> 16) & 0xFF;
      const b = (pixel >> 8) & 0xFF;
      totalLum += (0.299 * r + 0.587 * g + 0.114 * b) / 255;
      count++;
    }
  }

  return count > 0 ? totalLum / count : 0.5;
}

/**
 * Auto-detect best text color (white or black) based on image background.
 */
function autoTextColor(img: any, textX: number, textY: number, textW: number, textH: number): number {
  const brightness = sampleRegionBrightness(img, textX, textY, textW, textH);
  return brightness > 0.5
    ? hexToRGBA('#000000') // dark text on light bg
    : hexToRGBA('#FFFFFF'); // white text on dark bg
}

// =====================================
// BACKGROUND EFFECTS
// =====================================

function drawRect(img: any, x: number, y: number, w: number, h: number, color: number) {
  const rectImg = new Image(Math.max(1, w), Math.max(1, h));
  rectImg.fill(color);
  img.composite(rectImg, Math.max(0, x), Math.max(0, y));
}

function applyTextBackground(
  img: any,
  designStyle: string,
  textX: number,
  textY: number,
  textW: number,
  textH: number,
  brandColor?: string,
) {
  const padding = Math.round(Math.max(textW, textH) * 0.08);
  const bgX = Math.max(0, textX - padding);
  const bgY = Math.max(0, textY - padding);
  const bgW = Math.min(img.width - bgX, textW + padding * 2);
  const bgH = Math.min(img.height - bgY, textH + padding * 2);

  switch (designStyle) {
    case 'overlay':
      drawRect(img, bgX, bgY, bgW, bgH, hexToRGBA('#000000', 140));
      break;

    case 'gradient_bar': {
      // Gradient approximation: 3 bands fading from opaque to transparent
      const bandH = Math.round(bgH / 3);
      drawRect(img, bgX, bgY, bgW, bandH, hexToRGBA(brandColor || '#000000', 200));
      drawRect(img, bgX, bgY + bandH, bgW, bandH, hexToRGBA(brandColor || '#000000', 160));
      drawRect(img, bgX, bgY + bandH * 2, bgW, bgH - bandH * 2, hexToRGBA(brandColor || '#000000', 120));
      break;
    }

    case 'boxed': {
      const boxColor = brandColor || '#FFFFFF';
      drawRect(img, bgX, bgY, bgW, bgH, hexToRGBA(boxColor, 230));
      // Border
      const borderW = 3;
      const borderColor = hexToRGBA(brandColor ? '#FFFFFF' : '#000000', 200);
      drawRect(img, bgX, bgY, bgW, borderW, borderColor);
      drawRect(img, bgX, bgY + bgH - borderW, bgW, borderW, borderColor);
      drawRect(img, bgX, bgY, borderW, bgH, borderColor);
      drawRect(img, bgX + bgW - borderW, bgY, borderW, bgH, borderColor);
      break;
    }

    case 'card_overlay':
      drawRect(img, bgX, bgY, bgW, bgH, hexToRGBA('#000000', 180));
      break;

    case 'badge': {
      const badgeColor = brandColor || '#E53E3E';
      drawRect(img, bgX, bgY, bgW, bgH, hexToRGBA(badgeColor, 240));
      break;
    }

    case 'shadow_drop':
    case 'clean':
    case 'neon_glow':
    case 'cutout':
    case 'plaquinha':
      // These are handled via shadow rendering, no background
      break;

    default:
      // No background
      break;
  }
}

// =====================================
// MAIN TEXT OVERLAY FUNCTION
// =====================================

export async function applyTextOverlay(
  imageData: Uint8Array,
  config: TextOverlayConfig,
): Promise<Uint8Array> {
  if (!config.elements || config.elements.length === 0) {
    return imageData;
  }

  // Filter empty elements
  const validElements = config.elements.filter(e => e.text && e.text.trim().length > 0);
  if (validElements.length === 0) return imageData;

  console.log(`[TextOverlay] Processing ${validElements.length} text element(s), style: ${config.designStyle}`);

  try {
    const img = await Image.decode(imageData);
    const imgW = img.width;
    const imgH = img.height;

    for (const element of validElements) {
      try {
        // Download font
        const font = await downloadFont(
          element.fontFamily || 'Montserrat',
          element.fontWeight || '700',
        );

        // Calculate font size relative to image
        const fontSize = element.fontSize || Math.round(imgH * 0.06);
        const maxWidth = Math.round(imgW * 0.85);

        // Render text to separate image
        const textImg = Image.renderText(font, fontSize, element.text, element.color, {
          maxWidth,
          wrapStyle: 'word',
          horizontalAlign: 'center',
          wrapHardBreaks: true,
        });

        if (!textImg || textImg.width === 0 || textImg.height === 0) {
          console.warn(`[TextOverlay] renderText returned empty image for "${element.text.substring(0, 30)}"`);
          continue;
        }

        // Calculate position
        const margin = Math.round(imgW * 0.04);
        let x: number, y: number;

        switch (element.position) {
          case 'top':
            x = Math.round((imgW - textImg.width) / 2);
            y = margin + Math.round(imgH * 0.06);
            break;
          case 'center':
            x = Math.round((imgW - textImg.width) / 2);
            y = Math.round((imgH - textImg.height) / 2);
            break;
          case 'bottom':
            x = Math.round((imgW - textImg.width) / 2);
            y = imgH - textImg.height - margin - Math.round(imgH * 0.06);
            break;
          case 'top-left':
            x = margin;
            y = margin;
            break;
          case 'top-right':
            x = imgW - textImg.width - margin;
            y = margin;
            break;
          case 'bottom-left':
            x = margin;
            y = imgH - textImg.height - margin;
            break;
          case 'bottom-right':
            x = imgW - textImg.width - margin;
            y = imgH - textImg.height - margin;
            break;
          default:
            x = Math.round((imgW - textImg.width) / 2);
            y = Math.round((imgH - textImg.height) / 2);
        }

        // Clamp to image bounds
        x = Math.max(0, Math.min(x, imgW - textImg.width));
        y = Math.max(0, Math.min(y, imgH - textImg.height));

        // Apply background effect based on design style
        applyTextBackground(img, config.designStyle, x, y, textImg.width, textImg.height, config.brandColor);

        // Render shadow for styles that need it
        const needsShadow = ['clean', 'shadow_drop', 'neon_glow'].includes(config.designStyle);
        if (needsShadow) {
          const shadowAlpha = config.designStyle === 'neon_glow' ? 200 : 160;
          const shadowColorHex = config.designStyle === 'neon_glow'
            ? (config.brandColor || '#3B82F6')
            : '#000000';
          const shadowColor = hexToRGBA(shadowColorHex, shadowAlpha);

          const shadowImg = Image.renderText(font, fontSize, element.text, shadowColor, {
            maxWidth,
            wrapStyle: 'word',
            horizontalAlign: 'center',
            wrapHardBreaks: true,
          });

          const shadowOffset = Math.max(2, Math.round(fontSize * 0.05));
          const shadowBlurSteps = config.designStyle === 'neon_glow' ? 3 : 1;

          for (let s = shadowBlurSteps; s >= 1; s--) {
            const offset = shadowOffset * s;
            img.composite(shadowImg, x + offset, y + offset);
            if (config.designStyle === 'neon_glow') {
              img.composite(shadowImg, x - offset, y - offset);
              img.composite(shadowImg, x + offset, y - offset);
              img.composite(shadowImg, x - offset, y + offset);
            }
          }
        }

        // Composite the actual text
        img.composite(textImg, x, y);

        console.log(`[TextOverlay] Rendered "${element.role}": "${element.text.substring(0, 40)}..." at (${x},${y}), size ${fontSize}px`);

      } catch (elemError) {
        console.error(`[TextOverlay] Failed to render "${element.role}":`, elemError);
      }
    }

    const encoded = await img.encode(1); // PNG
    console.log(`[TextOverlay] Complete. Output: ${encoded.length} bytes`);
    return new Uint8Array(encoded);

  } catch (error) {
    console.error('[TextOverlay] Fatal error, returning original image:', error);
    return imageData;
  }
}

// =====================================
// HELPER: Build TextOverlayConfig from form data
// =====================================

export function buildTextOverlayConfig(params: {
  includeText: boolean;
  textContent?: string;
  textPosition?: string;
  fontFamily?: string;
  fontWeight?: string;
  fontSize?: number;
  textDesignStyle?: string;
  ctaText?: string;
  headline?: string;
  subtexto?: string;
  disclaimerText?: string;
  disclaimerStyle?: string;
  brandColor?: string;
  contentType?: string;
  imageWidth: number;
  imageHeight: number;
}): TextOverlayConfig | null {
  if (!params.includeText) return null;

  const elements: TextElement[] = [];
  const imgH = params.imageHeight;

  // Determine text color based on design style
  const needsDarkText = ['boxed'].includes(params.textDesignStyle || '');
  const textColor = needsDarkText
    ? hexToRGBA('#000000')
    : hexToRGBA('#FFFFFF');

  // PRIMARY TEXT (headline)
  const primaryText = params.textContent || params.headline || '';
  if (primaryText.trim()) {
    const baseFontSize = params.fontSize || Math.round(imgH * 0.055);
    elements.push({
      text: primaryText.trim(),
      position: (params.textPosition as any) || 'center',
      fontSize: baseFontSize,
      fontFamily: params.fontFamily || 'Montserrat',
      fontWeight: params.fontWeight || '700',
      color: textColor,
      role: 'headline',
    });
  }

  // CTA TEXT
  const ctaText = params.ctaText || '';
  if (ctaText.trim()) {
    elements.push({
      text: ctaText.trim(),
      position: 'bottom',
      fontSize: Math.round(imgH * 0.035),
      fontFamily: params.fontFamily || 'Montserrat',
      fontWeight: '600',
      color: textColor,
      role: 'cta',
    });
  }

  // DISCLAIMER TEXT
  if (params.disclaimerText?.trim()) {
    elements.push({
      text: params.disclaimerText.trim(),
      position: 'bottom-left',
      fontSize: Math.round(imgH * 0.015),
      fontFamily: 'Roboto',
      fontWeight: '400',
      color: hexToRGBA('#FFFFFF', 180),
      role: 'disclaimer',
    });
  }

  if (elements.length === 0) return null;

  return {
    elements,
    designStyle: params.textDesignStyle || 'clean',
    brandColor: params.brandColor,
    imageWidth: params.imageWidth,
    imageHeight: params.imageHeight,
  };
}
