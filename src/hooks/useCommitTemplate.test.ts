import { describe, it, expect } from "vitest";
import { defaultFontAssetsFromZones } from "@/hooks/useCommitTemplate";
import type { TemplateTextZone } from "@/types/template";

function zone(font: string): TemplateTextZone {
  return {
    id: crypto.randomUUID(),
    label: "Z",
    bbox: { x: 0, y: 0, w: 1, h: 0.1 },
    font_family: font,
    font_weight: 400,
    font_size_px: 24,
    color: "#000",
    align: "left",
    line_height: 1.2,
  };
}

describe("defaultFontAssetsFromZones", () => {
  it("maps known Google fonts automatically", () => {
    const out = defaultFontAssetsFromZones([zone("Inter"), zone("Poppins")]);
    expect(out["Inter"]).toEqual({ source: "google", weights: [400, 700] });
    expect(out["Poppins"]).toEqual({ source: "google", weights: [400, 700] });
  });
  it("does not invent assets for unknown families", () => {
    const out = defaultFontAssetsFromZones([zone("Some Custom Sans")]);
    expect(out["Some Custom Sans"]).toBeUndefined();
  });
  it("preserves pre-existing entries", () => {
    const existing = { Inter: { source: "custom" as const, font_id: "x" } };
    const out = defaultFontAssetsFromZones([zone("Inter")], existing);
    expect(out["Inter"]).toEqual({ source: "custom", font_id: "x" });
  });
});
