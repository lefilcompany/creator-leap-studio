import { assertEquals, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { autoShrinkFontSize, bboxToPx, fitInBox, wrapLines } from "./templateCanvas.ts";

Deno.test("autoShrinkFontSize: já cabe", () => {
  const r = autoShrinkFontSize({
    startPx: 48,
    bboxWidthPx: 500,
    measureWidth: (px) => px * 5, // a 48px -> 240, cabe.
  });
  assertEquals(r.fontSize, 48);
  assert(r.fits);
});

Deno.test("autoShrinkFontSize: encolhe em passos de 2px", () => {
  // Medida proporcional: cabe se px <= 30.
  const r = autoShrinkFontSize({
    startPx: 48,
    bboxWidthPx: 300,
    measureWidth: (px) => px * 10,
  });
  assertEquals(r.fontSize, 30);
  assert(r.fits);
});

Deno.test("autoShrinkFontSize: respeita piso de 12px e marca !fits", () => {
  const r = autoShrinkFontSize({
    startPx: 48,
    bboxWidthPx: 50,
    measureWidth: (px) => px * 100, // nunca cabe
  });
  assertEquals(r.fontSize, 12);
  assertEquals(r.fits, false);
});

Deno.test("fitInBox contain: respeita aspect ratio dentro do box com padding", () => {
  const r = fitInBox({
    box: { x: 10, y: 20, w: 200, h: 100 },
    src: { w: 400, h: 400 }, // quadrado
    fit: "contain",
    padding: 10,
  });
  // box interno 180x80 → contain quadrado = 80x80 centralizado.
  assertEquals(r.w, 80);
  assertEquals(r.h, 80);
  assertEquals(r.x, 10 + 10 + (180 - 80) / 2);
  assertEquals(r.y, 20 + 10 + (80 - 80) / 2);
});

Deno.test("fitInBox cover: preenche o box", () => {
  const r = fitInBox({
    box: { x: 0, y: 0, w: 200, h: 100 },
    src: { w: 100, h: 100 },
    fit: "cover",
  });
  // Cover quadrado em 200x100 → 200x200 (estoura a altura) centralizado.
  assertEquals(r.w, 200);
  assertEquals(r.h, 200);
  assertEquals(r.x, 0);
  assertEquals(r.y, -50);
});

Deno.test("wrapLines: quebra por palavra", () => {
  const lines = wrapLines("um dois três quatro", 8, (s) => s.length);
  assertEquals(lines, ["um dois", "três", "quatro"]);
});

Deno.test("wrapLines: palavra única maior que maxWidth não é cortada", () => {
  const lines = wrapLines("supercalifragilistic", 5, (s) => s.length);
  assertEquals(lines, ["supercalifragilistic"]);
});

Deno.test("bboxToPx: converte normalizado para pixels", () => {
  const r = bboxToPx({ x: 0.1, y: 0.2, w: 0.5, h: 0.25 }, 1000, 800);
  assertEquals(r, { x: 100, y: 160, w: 500, h: 200 });
});
