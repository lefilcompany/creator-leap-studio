import { Canvas as FabricCanvas } from 'fabric';

export const initializeCanvas = (canvasElement: HTMLCanvasElement, width: number, height: number): FabricCanvas => {
  const canvas = new FabricCanvas(canvasElement, {
    width,
    height,
    backgroundColor: '#ffffff',
    preserveObjectStacking: true,
  });

  return canvas;
};

export const loadGoogleFont = (fontFamily: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && (window as any).WebFont) {
      (window as any).WebFont.load({
        google: {
          families: [fontFamily]
        },
        active: () => resolve(),
        inactive: () => reject(new Error(`Failed to load font: ${fontFamily}`))
      });
    } else {
      reject(new Error('WebFont loader not available'));
    }
  });
};
