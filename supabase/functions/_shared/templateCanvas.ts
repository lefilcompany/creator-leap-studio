/**
 * Composição determinística de templates.
 *
 * A função principal `composeTemplate` usa `@napi-rs/canvas` via npm specifier.
 * Os algoritmos puros (`autoShrinkFontSize`, `fitInBox`, `wrapLines`) são
 * extraídos para teste isolado sem depender da lib de canvas.
 */

import type { LogoSlot, TextZone } from "./templates.ts";

export interface ComposeInput {
  background: Uint8Array; // PNG do fundo (Branch A ou B).
  width: number;
  height: number;
  zones: Array<TextZone & { value: string }>;
  logoSlot?: LogoSlot | null;
  logoBytes?: Uint8Array | null;
  fontBytes: Map<string, Uint8Array>; // chave = `${family}|${weight}` -> bytes
}

/**
 * Auto-shrink: reduz `font_size_px` em passos de 2px até a largura medida
 * caber em `bboxWidthPx`. Piso de 12px. Retorna {fontSize, fits}.
 */
export function autoShrinkFontSize(opts: {
  startPx: number;
  bboxWidthPx: number;
  measureWidth: (sizePx: number) => number;
  minPx?: number;
  step?: number;
}): { fontSize: number; fits: boolean } {
  const min = opts.minPx ?? 12;
  const step = opts.step ?? 2;
  let size = Math.max(min, opts.startPx);
  while (size >= min) {
    if (opts.measureWidth(size) <= opts.bboxWidthPx) {
      return { fontSize: size, fits: true };
    }
    size -= step;
  }
  return { fontSize: min, fits: opts.measureWidth(min) <= opts.bboxWidthPx };
}

/**
 * Calcula posição+tamanho para encaixar `src` em `box` com modo `contain`/`cover`
 * e `padding` (em px). Retorna coordenadas absolutas.
 */
export function fitInBox(opts: {
  box: { x: number; y: number; w: number; h: number };
  src: { w: number; h: number };
  fit: "contain" | "cover";
  padding?: number;
}): { x: number; y: number; w: number; h: number } {
  const p = opts.padding ?? 0;
  const bw = Math.max(0, opts.box.w - 2 * p);
  const bh = Math.max(0, opts.box.h - 2 * p);
  const ratio = opts.src.w / opts.src.h;
  const boxRatio = bw / bh;
  let w: number, h: number;
  if (opts.fit === "contain") {
    if (ratio > boxRatio) {
      w = bw;
      h = bw / ratio;
    } else {
      h = bh;
      w = bh * ratio;
    }
  } else {
    if (ratio > boxRatio) {
      h = bh;
      w = bh * ratio;
    } else {
      w = bw;
      h = bw / ratio;
    }
  }
  return {
    x: opts.box.x + p + (bw - w) / 2,
    y: opts.box.y + p + (bh - h) / 2,
    w,
    h,
  };
}

/**
 * Quebra `text` em linhas que cabem em `maxWidth`. Usa quebra por palavra
 * preservando palavras grandes (sem hifenização agressiva).
 */
export function wrapLines(
  text: string,
  maxWidth: number,
  measure: (s: string) => number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (const w of words) {
    const probe = current ? current + " " + w : w;
    if (measure(probe) <= maxWidth || !current) {
      current = probe;
    } else {
      lines.push(current);
      current = w;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function bboxToPx(
  bbox: { x: number; y: number; w: number; h: number },
  width: number,
  height: number,
): { x: number; y: number; w: number; h: number } {
  return {
    x: bbox.x * width,
    y: bbox.y * height,
    w: bbox.w * width,
    h: bbox.h * height,
  };
}

/**
 * Renderização concreta via @napi-rs/canvas. Mantida fora do hot path de testes.
 * Throws com mensagens claras se uma zona não couber mesmo após shrink.
 */
export async function composeTemplate(input: ComposeInput): Promise<Uint8Array> {
  // Import dinâmico para permitir testes sem nativo.
  const mod = await import("npm:@napi-rs/canvas@0.1.59");
  const { createCanvas, loadImage, GlobalFonts } = mod;

  // Registra fontes.
  for (const [key, bytes] of input.fontBytes.entries()) {
    const family = key.split("|")[0];
    try {
      GlobalFonts.register(bytes as any, family);
    } catch {
      // Já registrada; segue.
    }
  }

  const canvas = createCanvas(input.width, input.height);
  const ctx = canvas.getContext("2d");

  // 1. Fundo.
  const bg = await loadImage(input.background as any);
  ctx.drawImage(bg, 0, 0, input.width, input.height);

  // 2. Zonas de texto.
  for (const z of input.zones) {
    const box = bboxToPx(z.bbox, input.width, input.height);
    const measureWidth = (sizePx: number) => {
      ctx.font = `${z.font_weight} ${sizePx}px "${z.font_family}"`;
      return ctx.measureText(z.value).width;
    };
    const { fontSize, fits } = autoShrinkFontSize({
      startPx: z.font_size_px,
      bboxWidthPx: box.w,
      measureWidth,
    });
    if (!fits) {
      // Quebra em linhas como último recurso.
      ctx.font = `${z.font_weight} ${fontSize}px "${z.font_family}"`;
      const lines = wrapLines(z.value, box.w, (s) => ctx.measureText(s).width);
      const lineHeight = fontSize * (z.line_height ?? 1.2);
      if (lines.length * lineHeight > box.h) {
        throw new Error(`Texto da zona "${z.label}" excede o espaço disponível`);
      }
      drawLines(ctx, lines, z, box, fontSize, lineHeight);
      continue;
    }
    ctx.font = `${z.font_weight} ${fontSize}px "${z.font_family}"`;
    ctx.fillStyle = z.color;
    ctx.textBaseline = "top";
    ctx.textAlign = z.align;
    const x = z.align === "center" ? box.x + box.w / 2 : z.align === "right" ? box.x + box.w : box.x;
    ctx.fillText(z.value, x, box.y);
  }

  // 3. Logo (se houver slot + bytes).
  if (input.logoSlot && input.logoBytes) {
    const logo = await loadImage(input.logoBytes as any);
    const box = bboxToPx(input.logoSlot.bbox, input.width, input.height);
    const fitted = fitInBox({
      box,
      src: { w: logo.width, h: logo.height },
      fit: input.logoSlot.fit,
      padding: input.logoSlot.padding ?? 0,
    });
    ctx.drawImage(logo, fitted.x, fitted.y, fitted.w, fitted.h);
  }

  return canvas.toBuffer("image/png");
}

function drawLines(
  ctx: any,
  lines: string[],
  z: TextZone,
  box: { x: number; y: number; w: number; h: number },
  fontSize: number,
  lineHeight: number,
) {
  ctx.fillStyle = z.color;
  ctx.textBaseline = "top";
  ctx.textAlign = z.align;
  const x = z.align === "center" ? box.x + box.w / 2 : z.align === "right" ? box.x + box.w : box.x;
  lines.forEach((line, i) => ctx.fillText(line, x, box.y + i * lineHeight));
}
