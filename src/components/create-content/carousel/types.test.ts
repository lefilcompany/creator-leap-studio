import { describe, it, expect } from "vitest";
import type { SlideState, CarouselResult } from "./types";

describe("carousel types", () => {
  it("permite criar um SlideState com defaults mínimos", () => {
    const slide: SlideState = { index: 0, prompt: "uma imagem teste" };
    expect(slide.index).toBe(0);
    expect(slide.status).toBeUndefined();
  });

  it("permite todos os status válidos", () => {
    const statuses: NonNullable<SlideState["status"]>[] = [
      "pending",
      "generating",
      "done",
      "error",
    ];
    for (const s of statuses) {
      const slide: SlideState = { index: 1, prompt: "p", status: s };
      expect(slide.status).toBe(s);
    }
  });

  it("CarouselResult agrega slides + legenda", () => {
    const result: CarouselResult = {
      slidesCount: 2,
      slides: [
        { index: 0, prompt: "a", status: "done", imageUrl: "https://x/a.jpg" },
        { index: 1, prompt: "b", status: "pending" },
      ],
      caption: { title: "T", body: "B", hashtags: ["#x", "#y"] },
    };
    expect(result.slides).toHaveLength(2);
    expect(result.caption?.hashtags).toContain("#x");
  });
});
