import { describe, it, expect } from "vitest";
import { GOOGLE_FONTS, isGoogleFont } from "@/lib/googleFonts";

describe("googleFonts", () => {
  it("contains Inter and Poppins", () => {
    expect(GOOGLE_FONTS).toContain("Inter");
    expect(GOOGLE_FONTS).toContain("Poppins");
  });
  it("isGoogleFont recognizes curated fonts", () => {
    expect(isGoogleFont("Inter")).toBe(true);
    expect(isGoogleFont("Custom Brand Sans")).toBe(false);
  });
});
