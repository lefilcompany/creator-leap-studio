/**
 * Image processing utilities for aspect ratio adjustment
 * Uses canvas for high-quality cropping and resizing
 */

import { ASPECT_RATIO_DIMENSIONS } from './platformSpecs';

export interface ProcessImageOptions {
  imageUrl: string;
  aspectRatio: string;
  mode?: 'cover' | 'contain' | 'exact';
  quality?: number;
  outputFormat?: 'image/png' | 'image/jpeg' | 'image/webp';
}

/**
 * Loads an image from URL or base64
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (error) => {
      console.error('Error loading image:', error);
      reject(new Error('Falha ao carregar imagem'));
    };
    img.src = url;
  });
}

/**
 * Calculates crop dimensions based on mode
 */
function calculateCropDimensions(
  img: HTMLImageElement,
  target: { width: number; height: number },
  mode: 'cover' | 'contain' | 'exact'
) {
  const imgAspect = img.width / img.height;
  const targetAspect = target.width / target.height;

  let sx = 0, sy = 0, sWidth = img.width, sHeight = img.height;
  let dx = 0, dy = 0, dWidth = target.width, dHeight = target.height;

  if (mode === 'cover') {
    // Fill entire canvas, crop excess (default behavior for social media)
    if (imgAspect > targetAspect) {
      // Image is wider than target - crop sides
      sWidth = img.height * targetAspect;
      sx = (img.width - sWidth) / 2;
    } else {
      // Image is taller than target - crop top/bottom
      sHeight = img.width / targetAspect;
      sy = (img.height - sHeight) / 2;
    }
  } else if (mode === 'contain') {
    // Keep entire image visible, add bars if necessary
    if (imgAspect > targetAspect) {
      dHeight = target.width / imgAspect;
      dy = (target.height - dHeight) / 2;
    } else {
      dWidth = target.height * imgAspect;
      dx = (target.width - dWidth) / 2;
    }
  }
  // mode === 'exact' uses already defined dimensions (stretches if necessary)

  return { sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight };
}

/**
 * Processes an image to match exact aspect ratio
 * @param options Processing options
 * @returns Promise with processed image as base64 data URL
 */
export async function processImageToAspectRatio(
  options: ProcessImageOptions
): Promise<string> {
  const {
    imageUrl,
    aspectRatio,
    mode = 'cover',
    quality = 0.95,
    outputFormat = 'image/png'
  } = options;

  console.log('🖼️ Processing image:', { aspectRatio, mode, outputFormat });

  // 1. Get target dimensions
  const targetDimensions = ASPECT_RATIO_DIMENSIONS[aspectRatio];
  if (!targetDimensions) {
    console.warn(`Aspect ratio ${aspectRatio} not supported, using original image`);
    return imageUrl; // Return original if not supported
  }

  try {
    // 2. Load the image
    const img = await loadImage(imageUrl);
    console.log('✅ Image loaded:', { width: img.width, height: img.height });

    // 3. Create canvas with target dimensions
    const canvas = document.createElement('canvas');
    canvas.width = targetDimensions.width;
    canvas.height = targetDimensions.height;
    const ctx = canvas.getContext('2d', { alpha: true });

    if (!ctx) {
      throw new Error('Não foi possível criar contexto do canvas');
    }

    // 4. Calculate crop dimensions and position
    const { sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight } =
      calculateCropDimensions(img, targetDimensions, mode);

    console.log('📐 Crop dimensions:', {
      source: { sx, sy, sWidth, sHeight },
      destination: { dx, dy, dWidth, dHeight },
      targetDimensions
    });

    // 5. Draw cropped/resized image with high quality
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    // Clear canvas with transparency
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.drawImage(
      img,
      sx, sy, sWidth, sHeight,  // source rectangle
      dx, dy, dWidth, dHeight   // destination rectangle
    );

    // 6. Convert to base64
    const processedImage = canvas.toDataURL(outputFormat, quality);
    console.log('✅ Image processed successfully');
    
    return processedImage;
  } catch (error) {
    console.error('❌ Error processing image:', error);
    throw error;
  }
}

/**
 * Gets dimensions info for an aspect ratio
 */
export function getAspectRatioDimensions(aspectRatio: string) {
  return ASPECT_RATIO_DIMENSIONS[aspectRatio];
}
