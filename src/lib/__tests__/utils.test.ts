import { describe, it, expect } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("mescla classes condicionais", () => {
    expect(cn("a", false && "b", "c")).toBe("a c");
  });
  it("dedupe com tailwind-merge", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
  });
});
