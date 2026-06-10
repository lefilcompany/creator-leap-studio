import { assertEquals, assertRejects, assert } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { parseVisionResponse } from "./templateVision.ts";

Deno.test("parseVisionResponse: JSON válido com zonas e logo", () => {
  const out = parseVisionResponse(JSON.stringify({
    text_zones: [
      {
        label: "Título",
        bbox: { x: 0.05, y: 0.1, w: 0.9, h: 0.2 },
        original_text: "Olá mundo",
        font_family: "Poppins",
        font_weight: 700,
        font_size_px: 48,
        color: "#FF0000",
        align: "center",
        line_height: 1.1,
      },
    ],
    logo_slot: {
      bbox: { x: 0.85, y: 0.85, w: 0.12, h: 0.12 },
      fit: "contain",
      padding: 8,
    },
  }));
  assertEquals(out.text_zones.length, 1);
  assertEquals(out.text_zones[0].label, "Título");
  assertEquals(out.text_zones[0].align, "center");
  assertEquals(out.text_zones[0].font_weight, 700);
  assertEquals(out.logo_slot?.fit, "contain");
  assertEquals(out.logo_slot?.padding, 8);
});

Deno.test("parseVisionResponse: extrai JSON envolvido em markdown", () => {
  const wrapped = "```json\n" + JSON.stringify({
    text_zones: [{ label: "X", bbox: { x: 0, y: 0, w: 1, h: 1 } }],
    logo_slot: null,
  }) + "\n```";
  const out = parseVisionResponse(wrapped);
  assertEquals(out.text_zones.length, 1);
  assertEquals(out.logo_slot, null);
});

Deno.test("parseVisionResponse: clampa bbox fora de 0..1", () => {
  const out = parseVisionResponse(JSON.stringify({
    text_zones: [{
      label: "X",
      bbox: { x: -0.5, y: 1.5, w: 2, h: -1 },
    }],
    logo_slot: null,
  }));
  const b = out.text_zones[0].bbox;
  assertEquals(b.x, 0);
  assertEquals(b.y, 1);
  assertEquals(b.w, 1);
  assertEquals(b.h, 0);
});

Deno.test("parseVisionResponse: defaults para campos faltantes", () => {
  const out = parseVisionResponse(JSON.stringify({
    text_zones: [{ label: "x", bbox: { x: 0, y: 0, w: 1, h: 1 } }],
  }));
  const z = out.text_zones[0];
  assertEquals(z.font_family, "Inter");
  assertEquals(z.font_weight, 500);
  assertEquals(z.align, "left");
  assert(z.id.length > 0);
});

Deno.test("parseVisionResponse: rejeita JSON inválido", () => {
  assertRejects(async () => parseVisionResponse("não é JSON"), Error);
});

Deno.test("parseVisionResponse: rejeita sem text_zones", () => {
  assertRejects(async () => parseVisionResponse(JSON.stringify({ foo: 1 })), Error);
});

Deno.test("parseVisionResponse: align inválido → left", () => {
  const out = parseVisionResponse(JSON.stringify({
    text_zones: [{ label: "x", bbox: { x: 0, y: 0, w: 1, h: 1 }, align: "justify" }],
  }));
  assertEquals(out.text_zones[0].align, "left");
});
