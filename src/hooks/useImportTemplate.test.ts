import { describe, it, expect } from "vitest";
import { validateImportFile } from "@/hooks/useImportTemplate";

function fakeFile(name: string, type: string, size: number): File {
  const blob = new Blob([new Uint8Array(size)], { type });
  return new File([blob], name, { type });
}

describe("useImportTemplate.validateImportFile", () => {
  it("accepts PDF under 5MB", () => {
    expect(validateImportFile(fakeFile("a.pdf", "application/pdf", 1024))).toBeNull();
  });
  it("rejects file > 5MB", () => {
    expect(validateImportFile(fakeFile("big.pdf", "application/pdf", 6 * 1024 * 1024))).toMatch(/5MB/);
  });
  it("rejects unknown mime", () => {
    expect(validateImportFile(fakeFile("a.txt", "text/plain", 10))).toMatch(/PDF|PNG/);
  });
});
