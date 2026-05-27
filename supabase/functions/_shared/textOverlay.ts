/**
 * Text overlay engine for generated images.
 * Uses ImageScript + SVG-based text rendering to apply typographic
 * elements (headline, subtitle, CTA, disclaimer) onto images.
 */

export interface TextElement {
  type: 'headline' | 'subtitle' | 'cta' | 'disclaimer';
  text: string;
  fontSize: number;
  fontWeight: number;
  color: string;
  x: number;
  y: number;
  maxWidth: number;
}

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

// Google Fonts download helper
async function downloadGoogleFont(family: string, weight: number): Promise<Uint8Array> {
  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&display=swap`;
  const cssResp = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
  });
  const css = await cssResp.text();

  const fontUrlMatch = css.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/);
  if (!fontUrlMatch) throw new Error(`Could not find font URL for ${family} ${weight}`);

  const fontResp = await fetch(fontUrlMatch[1]);
  const fontBuffer = await fontResp.arrayBuffer();
  console.log(`[TextOverlay] Font: ${family} ${weight} (${fontBuffer.byteLength} bytes)`);
  return new Uint8Array(fontBuffer);
}

function escapeXml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

// Calculate text layout positions based on config
function calculateLayout(config: TextOverlayConfig): TextElement[] {
  const { imageWidth, imageHeight } = config;
  const elements: TextElement[] = [];
  const padding = Math.round(imageWidth * 0.08);
  const maxTextWidth = imageWidth - padding * 2;

  // Determine base font sizes
  const baseFontSize = config.fontSize || Math.round(imageWidth * 0.06);
  const headlineFontSize = Math.round(baseFontSize * 1.3);
  const subtitleFontSize = Math.round(baseFontSize * 0.72);
  const ctaFontSize = Math.round(baseFontSize * 0.82);
  const disclaimerFontSize = Math.round(Math.max(12, imageWidth * 0.015));

  // Position calculation
  const position = config.textPosition || 'top';
  let startY: number;

  if (position.includes('center') || position === 'middle') {
    startY = Math.round(imageHeight * 0.35);
  } else if (position.includes('bottom')) {
    startY = Math.round(imageHeight * 0.6);
  } else {
    // top (default)
    startY = Math.round(imageHeight * 0.08);
  }

  let startX = padding;
  if (position.includes('right')) {
    startX = Math.round(imageWidth * 0.15);
  } else if (position.includes('left')) {
    startX = padding;
  }

  const color = config.brandColor || '#FFFFFF';
  let currentY = startY;

  if (config.headline) {
    elements.push({
      type: 'headline',
      text: config.headline,
      fontSize: headlineFontSize,
      fontWeight: 700,
      color,
      x: startX,
      y: currentY,
      maxWidth: maxTextWidth,
    });
    // Estimate lines for headline
    const estimatedCharsPerLine = Math.floor(maxTextWidth / (headlineFontSize * 0.55));
    const lines = Math.ceil(config.headline.length / estimatedCharsPerLine);
    currentY += headlineFontSize * 1.3 * lines + Math.round(imageHeight * 0.03);
  }

  if (config.subtexto) {
    elements.push({
      type: 'subtitle',
      text: config.subtexto,
      fontSize: subtitleFontSize,
      fontWeight: 400,
      color,
      x: startX,
      y: currentY,
      maxWidth: maxTextWidth,
    });
    const estimatedCharsPerLine = Math.floor(maxTextWidth / (subtitleFontSize * 0.5));
    const lines = Math.ceil(config.subtexto.length / estimatedCharsPerLine);
    currentY += subtitleFontSize * 1.3 * lines + Math.round(imageHeight * 0.04);
  }

  if (config.ctaText) {
    elements.push({
      type: 'cta',
      text: config.ctaText,
      fontSize: ctaFontSize,
      fontWeight: 700,
      color,
      x: startX,
      y: currentY,
      maxWidth: maxTextWidth,
    });
  }

  // Disclaimer at the very bottom, separate positioning
  if (config.disclaimerText) {
    const disclaimerY = imageHeight - padding;
    let disclaimerX = padding;
    
    if (config.disclaimerStyle === 'bottom_right_vertical') {
      disclaimerX = imageWidth - padding;
    } else if (config.disclaimerStyle === 'bottom_left_vertical') {
      disclaimerX = padding;
    }

    elements.push({
      type: 'disclaimer',
      text: config.disclaimerText,
      fontSize: disclaimerFontSize,
      fontWeight: 400,
      color: 'rgba(255,255,255,0.7)',
      x: disclaimerX,
      y: disclaimerY,
      maxWidth: maxTextWidth,
    });
  }

  return elements;
}

// SVG text wrapping helper
function wrapTextSvg(text: string, fontSize: number, maxWidth: number, fontFamily: string, fontWeight: number, color: string, x: number, y: number): string {
  const charWidth = fontSize * 0.55;
  const charsPerLine = Math.floor(maxWidth / charWidth);
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (testLine.length > charsPerLine && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  const lineHeight = fontSize * 1.3;
  return lines.map((line, i) =>
    `<text x="${x}" y="${y + i * lineHeight}" font-family="${fontFamily}" font-size="${fontSize}" font-weight="${fontWeight}" fill="${color}">${escapeXml(line)}</text>`
  ).join('\n');
}

/**
 * Apply text overlay onto an image using SVG compositing.
 */
export async function applyTextOverlay(
  imageData: Uint8Array,
  config: TextOverlayConfig
): Promise<TextOverlayResult> {
  const { Image } = await import('https://deno.land/x/imagescript@1.3.0/mod.ts');

  const elements = calculateLayout(config);
  if (elements.length === 0) {
    return { processedData: imageData, elementsApplied: 0 };
  }

  const fontFamily = config.fontFamily || 'Montserrat';
  const designStyle = config.textDesignStyle || 'clean';
  
  console.log(`[TextOverlay] Processing ${elements.length} element(s), style: ${designStyle}`);
  console.log(`[TextOverlay] Config: ${elements.length} elements, headline=${elements.find(e => e.type === 'headline')?.fontSize || 0}px, cta=${elements.find(e => e.type === 'cta')?.fontSize || 0}px, pos=${config.textPosition || 'top'}`);

  // Download fonts
  const [boldFont, regularFont] = await Promise.all([
    downloadGoogleFont(fontFamily, 700),
    downloadGoogleFont(fontFamily, 400),
  ]);

  // Decode image
  const img = await Image.decode(imageData);
  const { width, height } = img;

  // Build SVG with text elements
  let svgParts: string[] = [];

  // Add semi-transparent background for readability based on design style
  if (designStyle === 'gradient' || designStyle === 'dark') {
    svgParts.push(`<rect x="0" y="0" width="${width}" height="${height}" fill="rgba(0,0,0,0.4)" />`);
  } else if (designStyle === 'band') {
    // Band behind text area
    const firstEl = elements[0];
    const lastEl = elements[elements.length - 1];
    if (firstEl && lastEl) {
      const bandY = firstEl.y - 20;
      const bandH = (lastEl.y - firstEl.y) + lastEl.fontSize * 2 + 40;
      svgParts.push(`<rect x="0" y="${bandY}" width="${width}" height="${bandH}" fill="rgba(0,0,0,0.6)" />`);
    }
  }

  // Add text shadow for clean style
  if (designStyle === 'clean') {
    svgParts.push(`<defs><filter id="shadow"><feDropShadow dx="2" dy="2" stdDeviation="4" flood-color="rgba(0,0,0,0.7)" /></filter></defs>`);
  }

  const filterAttr = designStyle === 'clean' ? ' filter="url(#shadow)"' : '';

  for (const el of elements) {
    if (el.type === 'disclaimer') {
      if (config.disclaimerStyle?.includes('vertical')) {
        // Vertical text
        const rotation = config.disclaimerStyle === 'bottom_right_vertical' ? -90 : 90;
        const tx = el.x;
        const ty = el.y;
        svgParts.push(`<text x="${tx}" y="${ty}" font-family="${fontFamily}" font-size="${el.fontSize}" font-weight="${el.fontWeight}" fill="${el.color}" transform="rotate(${rotation}, ${tx}, ${ty})"${filterAttr}>${escapeXml(el.text)}</text>`);
      } else if (config.disclaimerStyle === 'bottom_band') {
        // Disclaimer with dark band
        const bandH = el.fontSize + 16;
        svgParts.push(`<rect x="0" y="${height - bandH}" width="${width}" height="${bandH}" fill="rgba(0,0,0,0.7)" />`);
        svgParts.push(`<text x="${width / 2}" y="${height - 8}" font-family="${fontFamily}" font-size="${el.fontSize}" font-weight="${el.fontWeight}" fill="${el.color}" text-anchor="middle">${escapeXml(el.text)}</text>`);
      } else {
        // bottom_horizontal
        svgParts.push(`<text x="${width / 2}" y="${el.y}" font-family="${fontFamily}" font-size="${el.fontSize}" font-weight="${el.fontWeight}" fill="${el.color}" text-anchor="middle"${filterAttr}>${escapeXml(el.text)}</text>`);
      }
    } else {
      const textSvg = wrapTextSvg(el.text, el.fontSize, el.maxWidth, fontFamily, el.fontWeight, el.color, el.x, el.y);
      svgParts.push(`<g${filterAttr}>${textSvg}</g>`);
    }
    console.log(`[TextOverlay] "${el.type}": "${el.text.substring(0, 50)}" at (${el.x},${el.y}) ${el.fontSize}px`);
  }

  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${svgParts.join('\n')}</svg>`;

  // Render SVG to image
  try {
    const svgImage = await Image.renderSVG(svgContent, width, { font: boldFont });
    
    // Composite SVG onto original image
    img.composite(svgImage, 0, 0);
    
    const outputData = await img.encode(1); // PNG
    console.log(`[TextOverlay] Complete. Output: ${outputData.length} bytes`);
    
    return {
      processedData: new Uint8Array(outputData),
      elementsApplied: elements.length,
    };
  } catch (svgError) {
    console.error('[TextOverlay] SVG rendering failed, trying fallback:', svgError);
    
    // Fallback: try simpler SVG without filters
    const simpleSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      ${elements.map(el => {
        if (el.type === 'disclaimer') {
          return `<text x="${width/2}" y="${el.y}" font-family="sans-serif" font-size="${el.fontSize}" fill="${el.color}" text-anchor="middle">${escapeXml(el.text)}</text>`;
        }
        return wrapTextSvg(el.text, el.fontSize, el.maxWidth, 'sans-serif', el.fontWeight, el.color, el.x, el.y);
      }).join('\n')}
    </svg>`;
    
    try {
      const fallbackImg = await Image.renderSVG(simpleSvg, width);
      img.composite(fallbackImg, 0, 0);
      const outputData = await img.encode(1);
      console.log(`[TextOverlay] Fallback complete. Output: ${outputData.length} bytes`);
      return { processedData: new Uint8Array(outputData), elementsApplied: elements.length };
    } catch (fallbackError) {
      console.error('[TextOverlay] All rendering failed, returning original:', fallbackError);
      return { processedData: imageData, elementsApplied: 0 };
    }
  }
}
