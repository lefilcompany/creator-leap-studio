import { assert, assertStringIncludes } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildBackgroundPrompt } from "./templateBackground.ts";
import { buildInpaintingPrompt } from "./templateInpainting.ts";

Deno.test("buildBackgroundPrompt: contém aspect ratio e proibição explícita de texto", () => {
  const p = buildBackgroundPrompt("praia ao pôr do sol", { aspectRatio: "1080:1080" });
  assertStringIncludes(p, "1080:1080");
  assertStringIncludes(p, "praia ao pôr do sol");
  assertStringIncludes(p, "NÃO desenhe nenhum texto");
});

Deno.test("buildBackgroundPrompt: injeta referências de estilo (Top 3)", () => {
  const p = buildBackgroundPrompt("x", {
    aspectRatio: "1:1",
    brandStyleNotes: ["a", "b", "c", "d"],
  });
  assertStringIncludes(p, "a | b | c");
  assert(!p.includes(" | d"));
});

Deno.test("buildInpaintingPrompt: lista zonas e logo", () => {
  const p = buildInpaintingPrompt(
    [{ bbox: { x: 0.1, y: 0.2, w: 0.5, h: 0.1 }, label: "Título", original_text: "Olá" }],
    { bbox: { x: 0.8, y: 0.8, w: 0.1, h: 0.1 }, fit: "contain" },
  );
  assertStringIncludes(p, "Título");
  assertStringIncludes(p, "Olá");
  assertStringIncludes(p, "Logo em");
  assertStringIncludes(p, "NÃO");
});
