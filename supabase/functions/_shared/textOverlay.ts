/**
 * Text Overlay Engine v2 - Renders text on images using ImageScript's font engine.
 * 
 * Key improvements over v1:
 * - Font sizes are ALWAYS relative to image dimensions (never raw px from form)
 * - Smart vertical layout: elements are stacked with proper spacing
 * - Expanded font support with robust fallback chain
 * - Auto text color based on background brightness
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

// Direct TTF URLs from GitHub-hosted Google Fonts mirrors
const DIRECT_FONT_URLS: Record<string, Record<string, string>> = {
  'Montserrat': {
    '400': 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/montserrat/Montserrat%5Bwght%5D.ttf',
    '600': 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/montserrat/Montserrat%5Bwght%5D.ttf',
    '700': 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/montserrat/Montserrat%5Bwght%5D.ttf',
  },
  'Roboto': {
    '400': 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/roboto/Roboto%5Bwdth%2Cwght%5D.ttf',
    '700': 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/roboto/Roboto%5Bwdth%2Cwght%5D.ttf',
  },
  'Open Sans': {
    '400': 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/opensans/OpenSans%5Bwdth%2Cwght%5D.ttf',
    '700': 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/opensans/OpenSans%5Bwdth%2Cwght%5D.ttf',
  },
  'Lato': {
    '400': 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/lato/Lato%5Bwght%5D.ttf',
    '700': 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/lato/Lato%5Bwght%5D.ttf',
  },
  'Poppins': {
    '400': 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/poppins/Poppins-Regular.ttf',
    '600': 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/poppins/Poppins-SemiBold.ttf',
    '700': 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/poppins/Poppins-Bold.ttf',
  },
  'Oswald': {
    '400': 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/oswald/Oswald%5Bwght%5D.ttf',
    '700': 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/oswald/Oswald%5Bwght%5D.ttf',
  },
  'Inter': {
    '400': 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/inter/Inter%5Bopsz%2Cwght%5D.ttf',
    '700': 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/inter/Inter%5Bopsz%2Cwght%5D.ttf',
  },
  'Playfair Display': {
    '400': 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/playfairdisplay/PlayfairDisplay%5Bwght%5D.ttf',
    '700': 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/playfairdisplay/PlayfairDisplay%5Bwght%5D.ttf',
  },
  'Bebas Neue': {
    '400': 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/bebasneue/BebasNeue-Regular.ttf',
    '700': 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/bebasneue/BebasNeue-Regular.ttf',
  },
  'Raleway': {
    '400': 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/raleway/Raleway%5Bwght%5D.ttf',
    '700': 'https://cdn.jsdelivr.net/gh/google/fonts@main/ofl/raleway/Raleway%5Bwght%5D.ttf',
  },
};

// Font family aliases - map common names to supported ones
const FONT_ALIASES: Record<string, string> = {
  'Roboto Slab': 'Montserrat',
  'Roboto Condensed': 'Roboto',
  'Noto Sans': 'Open Sans',
  'Source Sans Pro': 'Open Sans',
  'PT Sans': 'Open Sans',
  'Ubuntu': 'Open Sans',
  'Merriweather': 'Playfair Display',
  'Georgia': 'Playfair Display',
  'Times New Roman': 'Playfair Display',
  'Arial': 'Roboto',
  'Helvetica': 'Roboto',
  'Verdana': 'Open Sans',
  'Impact': 'Oswald',
  'Futura': 'Montserrat',
  'Gotham': 'Montserrat',
  'Avenir': 'Montserrat',
  'DM Sans': 'Inter',
  'Nunito': 'Poppins',
  'Nunito Sans': 'Poppins',
  'Quicksand': 'Poppins',
  'Work Sans': 'Inter',
  'Barlow': 'Montserrat',
  'Archivo': 'Montserrat',
};

function resolveFontFamily(requested: string): string {
  if (DIRECT_FONT_URLS[requested]) return requested;
  if (FONT_ALIASES[requested]) return FONT_ALIASES[requested];
  return 'Montserrat'; // ultimate fallback
}

async function downloadFont(fontFamily: string, weight: string = '700'): Promise<Uint8Array> {
  const resolved = resolveFontFamily(fontFamily);
  const cacheKey = `${resolved}-${weight}`;
  if (fontCache.has(cacheKey)) return fontCache.get(cacheKey)!;

  try {
    const familyUrls = DIRECT_FONT_URLS[resolved];
    const directUrl = familyUrls?.[weight] || familyUrls?.['400'] || familyUrls?.['700'];

    if (directUrl) {
      const fontResp = await fetch(directUrl);
      if (fontResp.ok) {
        const fontData = new Uint8Array(await fontResp.arrayBuffer());
        fontCache.set(cacheKey, fontData);
        if (resolved !== fontFamily) {
          console.log(`[TextOverlay] Font "${fontFamily}" → "${resolved}" ${weight} (${fontData.length} bytes)`);
        } else {
          console.log(`[TextOverlay] Font: ${resolved} ${weight} (${fontData.length} bytes)`);
        }
        return fontData;
      }
    }

    // Fallback to Montserrat
    if (resolved !== 'Montserrat') {
      console.warn(`[TextOverlay] Font "${resolved}" download failed, using Montserrat`);
      return downloadFont('Montserrat', weight);
    }

    throw new Error('Cannot load any font');
  } catch (error) {
    if (resolved !== 'Montserrat') {
      return downloadFont('Montserrat', weight);
    }
    throw error;
  }
}

// =====================================
// COLOR UTILITIES
// =====================================

function hexToRGBA(hex: string, alpha: number = 255): number {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  const r = parseInt(hex.slice(0, 2), 16) || 0;
  const g = parseInt(hex.slice(2, 4), 16) || 0;
  const b = parseInt(hex.slice(4, 6), 16) || 0;
  return ((r & 0xFF) << 24) | ((g & 0xFF) << 16) | ((b & 0xFF) << 8) | (alpha & 0xFF);
}

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

// =====================================
// BACKGROUND EFFECTS
// =====================================

function drawRect(img: any, x: number, y: number, w: number, h: number, color: number) {
  if (w <= 0 || h <= 0) return;
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
      const bandH = Math.round(bgH / 3);
      drawRect(img, bgX, bgY, bgW, bandH, hexToRGBA(brandColor || '#000000', 200));
      drawRect(img, bgX, bgY + bandH, bgW, bandH, hexToRGBA(brandColor || '#000000', 160));
      drawRect(img, bgX, bgY + bandH * 2, bgW, bgH - bandH * 2, hexToRGBA(brandColor || '#000000', 120));
      break;
    }
    case 'boxed': {
      const boxColor = brandColor || '#FFFFFF';
      drawRect(img, bgX, bgY, bgW, bgH, hexToRGBA(boxColor, 230));
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
    default:
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
  if (!config.elements || config.elements.length === 0) return imageData;

  const validElements = config.elements.filter(e => e.text && e.text.trim().length > 0);
  if (validElements.length === 0) return imageData;

  console.log(`[TextOverlay] Processing ${validElements.length} element(s), style: ${config.designStyle}`);

  try {
    const img = await Image.decode(imageData);
    const imgW = img.width;
    const imgH = img.height;
    const margin = Math.round(imgW * 0.05);

    // Pre-render all text images to know their heights for layout
    const renderedElements: Array<{
      element: TextElement;
      textImg: any;
      font: Uint8Array;
      fontSize: number;
    }> = [];

    for (const element of validElements) {
      try {
        const font = await downloadFont(element.fontFamily || 'Montserrat', element.fontWeight || '700');
        const fontSize = element.fontSize;
        const maxWidth = Math.round(imgW * 0.85);

        const textImg = Image.renderText(font, fontSize, element.text, element.color, {
          maxWidth,
          wrapStyle: 'word',
          horizontalAlign: 'center',
          wrapHardBreaks: true,
        });

        if (!textImg || textImg.width === 0 || textImg.height === 0) {
          console.warn(`[TextOverlay] Empty render for "${element.text.substring(0, 30)}"`);
          continue;
        }

        renderedElements.push({ element, textImg, font, fontSize });
      } catch (err) {
        console.error(`[TextOverlay] Failed to render "${element.role}":`, err);
      }
    }

    if (renderedElements.length === 0) return imageData;

    // Smart layout: group elements by vertical zone
    const topElements = renderedElements.filter(r => r.element.position.startsWith('top'));
    const centerElements = renderedElements.filter(r => r.element.position === 'center');
    const bottomElements = renderedElements.filter(r => r.element.position.startsWith('bottom'));

    const spacing = Math.round(imgH * 0.02);

    // Layout each group with proper vertical stacking
    const layoutGroup = (group: typeof renderedElements, anchorY: number, direction: 'down' | 'up') => {
      let currentY = anchorY;
      const ordered = direction === 'up' ? [...group].reverse() : group;

      for (const { element, textImg, font, fontSize } of ordered) {
        let x: number;
        if (element.position.includes('left')) {
          x = margin;
        } else if (element.position.includes('right')) {
          x = imgW - textImg.width - margin;
        } else {
          x = Math.round((imgW - textImg.width) / 2);
        }
        x = Math.max(0, Math.min(x, imgW - textImg.width));

        let y: number;
        if (direction === 'up') {
          y = currentY - textImg.height;
          currentY = y - spacing;
        } else {
          y = currentY;
          currentY = y + textImg.height + spacing;
        }
        y = Math.max(0, Math.min(y, imgH - textImg.height));

        // Background
        applyTextBackground(img, config.designStyle, x, y, textImg.width, textImg.height, config.brandColor);

        // Shadow for clean/shadow styles
        const needsShadow = ['clean', 'shadow_drop', 'neon_glow'].includes(config.designStyle);
        if (needsShadow) {
          const shadowAlpha = config.designStyle === 'neon_glow' ? 200 : 160;
          const shadowHex = config.designStyle === 'neon_glow' ? (config.brandColor || '#3B82F6') : '#000000';
          const shadowColor = hexToRGBA(shadowHex, shadowAlpha);
          const shadowImg = Image.renderText(font, fontSize, element.text, shadowColor, {
            maxWidth: Math.round(imgW * 0.85),
            wrapStyle: 'word',
            horizontalAlign: 'center',
            wrapHardBreaks: true,
          });
          const shadowOff = Math.max(2, Math.round(fontSize * 0.04));
          img.composite(shadowImg, x + shadowOff, y + shadowOff);
        }

        // Main text
        img.composite(textImg, x, y);

        console.log(`[TextOverlay] "${element.role}": "${element.text.substring(0, 50)}" at (${x},${y}) ${fontSize}px`);
      }
    };

    // Top elements: start from top margin, stack downward
    if (topElements.length > 0) {
      layoutGroup(topElements, margin + Math.round(imgH * 0.04), 'down');
    }

    // Center elements: center vertically
    if (centerElements.length > 0) {
      const totalH = centerElements.reduce((sum, r) => sum + r.textImg.height, 0) + spacing * (centerElements.length - 1);
      const startY = Math.round((imgH - totalH) / 2);
      layoutGroup(centerElements, startY, 'down');
    }

    // Bottom elements: start from bottom margin, stack upward
    if (bottomElements.length > 0) {
      layoutGroup(bottomElements, imgH - margin - Math.round(imgH * 0.04), 'up');
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
  const imgW = params.imageWidth;

  // ===== FONT SIZE CALCULATION =====
  // ALWAYS relative to image dimensions. Ignore raw fontSize from form (too small).
  // Headline: ~5.5-7% of image height (e.g., 74-95px on 1350px)
  // CTA: ~3.5-4% of image height
  // Disclaimer: ~1.5% of image height
  const headlineFontSize = Math.round(imgH * 0.06);
  const ctaFontSize = Math.round(imgH * 0.038);
  const disclaimerFontSize = Math.round(imgH * 0.018);

  // ===== TEXT COLOR =====
  // For boxed style, text should be dark; otherwise white with shadow
  const needsDarkText = ['boxed'].includes(params.textDesignStyle || '');
  const textColor = needsDarkText ? hexToRGBA('#1A1A1A') : hexToRGBA('#FFFFFF');

  // ===== MAP POSITION =====
  // Normalize position string to valid values
  const posMap: Record<string, TextElement['position']> = {
    'top': 'top',
    'center': 'center',
    'bottom': 'bottom',
    'top-left': 'top-left',
    'top-right': 'top-right',
    'bottom-left': 'bottom-left',
    'bottom-right': 'bottom-right',
    'superior': 'top',
    'central': 'center',
    'inferior': 'bottom',
  };
  const headlinePos = posMap[params.textPosition || 'center'] || 'center';

  // ===== PRIMARY TEXT (headline) =====
  const primaryText = params.textContent || params.headline || '';
  if (primaryText.trim()) {
    // If text is very long (>60 chars), reduce font size slightly
    const adjustedSize = primaryText.length > 60
      ? Math.round(headlineFontSize * 0.85)
      : primaryText.length > 40
        ? Math.round(headlineFontSize * 0.92)
        : headlineFontSize;

    elements.push({
      text: primaryText.trim(),
      position: headlinePos,
      fontSize: adjustedSize,
      fontFamily: resolveFontFamily(params.fontFamily || 'Montserrat'),
      fontWeight: params.fontWeight || '700',
      color: textColor,
      role: 'headline',
    });
  }

  // ===== SUBTITLE =====
  if (params.subtexto?.trim() && params.subtexto.trim().length > 3) {
    // Place subtitle right below headline
    const subtitlePos = headlinePos === 'top' ? 'top' : headlinePos === 'bottom' ? 'bottom' : 'center';
    elements.push({
      text: params.subtexto.trim(),
      position: subtitlePos,
      fontSize: Math.round(headlineFontSize * 0.55),
      fontFamily: resolveFontFamily(params.fontFamily || 'Montserrat'),
      fontWeight: '400',
      color: needsDarkText ? hexToRGBA('#333333') : hexToRGBA('#FFFFFF', 220),
      role: 'subtitle',
    });
  }

  // ===== CTA TEXT =====
  if (params.ctaText?.trim()) {
    elements.push({
      text: params.ctaText.trim().toUpperCase(),
      position: 'bottom',
      fontSize: ctaFontSize,
      fontFamily: resolveFontFamily(params.fontFamily || 'Montserrat'),
      fontWeight: '700',
      color: textColor,
      role: 'cta',
    });
  }

  // ===== DISCLAIMER =====
  if (params.disclaimerText?.trim()) {
    elements.push({
      text: params.disclaimerText.trim(),
      position: 'bottom-left',
      fontSize: disclaimerFontSize,
      fontFamily: 'Roboto',
      fontWeight: '400',
      color: hexToRGBA('#FFFFFF', 180),
      role: 'disclaimer',
    });
  }

  if (elements.length === 0) return null;

  console.log(`[TextOverlay] Config: ${elements.length} elements, headline=${headlineFontSize}px, cta=${ctaFontSize}px, pos=${headlinePos}`);

  return {
    elements,
    designStyle: params.textDesignStyle || 'clean',
    brandColor: params.brandColor,
    imageWidth: params.imageWidth,
    imageHeight: params.imageHeight,
  };
}
