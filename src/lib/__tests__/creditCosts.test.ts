import { describe, it, expect } from "vitest";
import {
  CREDIT_COSTS,
  formatCredits,
  getCreditCostLabel,
  getOpenAIImageCost,
} from "@/lib/creditCosts";

describe("creditCosts", () => {
  it("expõe custos canônicos esperados", () => {
    expect(CREDIT_COSTS.QUICK_IMAGE).toBe(3);
    expect(CREDIT_COSTS.VIDEO_GENERATION).toBe(25);
    expect(CREDIT_COSTS.IMAGE_EDIT).toBe(1);
  });

  it("getOpenAIImageCost mapeia qualidade", () => {
    expect(getOpenAIImageCost("low")).toBe(4);
    expect(getOpenAIImageCost("medium")).toBe(8);
    expect(getOpenAIImageCost("high")).toBe(15);
    expect(getOpenAIImageCost("auto")).toBe(8);
    expect(getOpenAIImageCost(undefined)).toBe(8);
  });

  it("formatCredits singular/plural", () => {
    expect(formatCredits(1)).toBe("1 crédito");
    expect(formatCredits(0)).toBe("0 créditos");
    expect(formatCredits(5)).toBe("5 créditos");
  });

  it("getCreditCostLabel devolve rótulo legível", () => {
    expect(getCreditCostLabel("QUICK_IMAGE")).toMatch(/Imagem/);
    expect(getCreditCostLabel("CONTENT_PLAN")).toMatch(/Calendário/);
  });
});
