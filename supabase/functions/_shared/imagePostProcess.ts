/**
 * Post-processing utility for generated images.
 * Performs center-crop + resize to ensure the output matches
 * the exact dimensions requested by the user, regardless of
 * what the image generation model produced.
 * 
 * Uses pure TypeScript PNG/JPEG decoding via canvas-like approach
 * compatible with Deno Edge Functions.
 */

export interface PostProcessResult {
  processedData: Uint8Array;
  finalWidth: number;
  finalHeight: number;
  finalAspectRatio: string;
  requestedAspectRatio: string;
  wasCropped: boolean;
  wasResized: boolean;
}

export const ASPECT_RATIO_DIMENSIONS: Record<string, { width: number; height: number }> = {
  '1:1': { width: 1080, height: 1080 },
  '4:5': { width: 1080, height: 1350 },
  '5:4': { width: 1080, height: 864 },
  '9:16': { width: 1080, height: 1920 },
  '16:9': { width: 1920, height: 1080 },
  '3:4': { width: 1080, height: 1440 },
  '4:3': { width: 1080, height: 810 },
  '2:3': { width: 1080, height: 1620 },
  '3:2': { width: 1080, height: 720 },
  '21:9': { width: 1920, height: 823 },
  '1.91:1': { width: 1200, height: 630 },
};

// Gemini only supports these aspect ratios natively
const GEMINI_SUPPORTED_RATIOS = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'];

/**
 * Normalize an aspect ratio string to one supported by Gemini.
 * Returns undefined if no suitable mapping exists.
 */
export function normalizeAspectRatioForGemini(ratio: string | undefined): string | undefined {
  if (!ratio) return undefined;
  if (GEMINI_SUPPORTED_RATIOS.includes(ratio)) return ratio;
  if (ratio === '1.91:1') return '16:9';
  return undefined;
}

/**
 * Resolve the target aspect ratio from request data with priority:
 * 1. Explicit aspectRatio from request
 * 2. Derived from width/height
 * 3. Platform fallback
 * 4. Default '1:1'
 */
export function resolveAspectRatio(params: {
  aspectRatio?: string;
  width?: number | string;
  height?: number | string;
  platform?: string;
}): { aspectRatio: string; source: string } {
  const PLATFORM_FALLBACK: Record<string, string> = {
    'Instagram': '4:5',
    'Facebook': '1:1',
    'TikTok': '9:16',
    'LinkedIn': '1:1',
    'Twitter/X': '16:9',
    'Comunidades': '1:1',
  };

  // 1. Explicit aspectRatio
  if (params.aspectRatio && params.aspectRatio.includes(':')) {
    return { aspectRatio: params.aspectRatio, source: 'request' };
  }

  // 2. Derive from width/height
  if (params.width && params.height) {
    const w = Number(params.width);
    const h = Number(params.height);
    if (w > 0 && h > 0) {
      // Find closest matching aspect ratio
      const targetRatio = w / h;
      let bestMatch = '1:1';
      let bestDiff = Infinity;
      for (const [ar, dims] of Object.entries(ASPECT_RATIO_DIMENSIONS)) {
        const diff = Math.abs((dims.width / dims.height) - targetRatio);
        if (diff < bestDiff) {
          bestDiff = diff;
          bestMatch = ar;
        }
      }
      return { aspectRatio: bestMatch, source: 'width_height' };
    }
  }

  // 3. Platform fallback
  if (params.platform) {
    const fallback = PLATFORM_FALLBACK[params.platform];
    if (fallback) return { aspectRatio: fallback, source: 'platform_fallback' };
  }

  // 4. Default
  return { aspectRatio: '1:1', source: 'default' };
}

/**
 * Decode base64 image data from a data URL or raw base64 string.
 */
export function decodeBase64Image(imageUrl: string): Uint8Array {
  let base64Data: string;
  if (imageUrl.startsWith('data:')) {
    base64Data = imageUrl.split(',')[1];
  } else {
    base64Data = imageUrl;
  }
  return Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
}

/**
 * Post-process an image by center-cropping and resizing to match
 * the exact target dimensions. Uses the ImageScript library for
 * Deno-compatible image manipulation.
 * 
 * If ImageScript is unavailable (import fails), returns the original
 * data with metadata indicating no processing was done.
 */
export async function postProcessImage(
  imageData: Uint8Array,
  targetAspectRatio: string,
  targetWidth?: number,
  targetHeight?: number,
): Promise<PostProcessResult> {
  // Determine target dimensions
  const dims = ASPECT_RATIO_DIMENSIONS[targetAspectRatio] || ASPECT_RATIO_DIMENSIONS['1:1'];
  const finalTargetWidth = targetWidth || dims.width;
  const finalTargetHeight = targetHeight || dims.height;

  try {
    // Dynamic import of ImageScript for Deno compatibility
    const { Image } = await import('https://deno.land/x/imagescript@1.3.0/mod.ts');
    
    const img = await Image.decode(imageData);
    const srcWidth = img.width;
    const srcHeight = img.height;

    console.log(`[PostProcess] Source: ${srcWidth}x${srcHeight}, Target: ${finalTargetWidth}x${finalTargetHeight} (${targetAspectRatio})`);

    // Calculate center-crop region to match target aspect ratio
    const targetRatio = finalTargetWidth / finalTargetHeight;
    const srcRatio = srcWidth / srcHeight;

    let cropX = 0, cropY = 0, cropW = srcWidth, cropH = srcHeight;
    let wasCropped = false;

    if (Math.abs(srcRatio - targetRatio) > 0.01) {
      wasCropped = true;
      if (srcRatio > targetRatio) {
        // Source is wider — crop sides
        cropW = Math.round(srcHeight * targetRatio);
        cropX = Math.round((srcWidth - cropW) / 2);
      } else {
        // Source is taller — crop top/bottom
        cropH = Math.round(srcWidth / targetRatio);
        cropY = Math.round((srcHeight - cropH) / 2);
      }
    }

    // Crop
    let processed = img.crop(cropX, cropY, cropW, cropH);

    // Resize to exact target dimensions
    const wasResized = processed.width !== finalTargetWidth || processed.height !== finalTargetHeight;
    processed = processed.resize(finalTargetWidth, finalTargetHeight);

    // Encode as PNG
    const outputData = await processed.encode(1); // PNG format

    console.log(`[PostProcess] Done: ${finalTargetWidth}x${finalTargetHeight}, cropped=${wasCropped}, resized=${wasResized}, size=${outputData.length} bytes`);

    return {
      processedData: new Uint8Array(outputData),
      finalWidth: finalTargetWidth,
      finalHeight: finalTargetHeight,
      finalAspectRatio: targetAspectRatio,
      requestedAspectRatio: targetAspectRatio,
      wasCropped,
      wasResized,
    };
  } catch (error) {
    console.error('[PostProcess] ImageScript processing failed, returning original:', error);
    
    // Fallback: return original data with metadata
    return {
      processedData: imageData,
      finalWidth: finalTargetWidth,
      finalHeight: finalTargetHeight,
      finalAspectRatio: targetAspectRatio,
      requestedAspectRatio: targetAspectRatio,
      wasCropped: false,
      wasResized: false,
    };
  }
}
