import { describe, it, expect } from "vitest";
import { resolveActionThumbnail } from "./actionThumbnail";

const BASE = "https://proj.supabase.co/storage/v1/object/public/content-images/";

describe("resolveActionThumbnail", () => {
  it("builds a public URL from a relative thumb_path", () => {
    expect(
      resolveActionThumbnail({ thumbPath: "user-123/abc.jpg" }, BASE),
    ).toBe(`${BASE}user-123/abc.jpg`);
  });

  it("keeps a 'content-images/' prefix when it is part of the stored object path", () => {
    expect(
      resolveActionThumbnail({ thumbPath: "content-images/u/1.jpg" }, BASE),
    ).toBe(`${BASE}content-images/u/1.jpg`);
  });

  it("re-resolves an absolute storage URL in thumb_path against the current base", () => {
    const stale = "https://old-project.supabase.co/storage/v1/object/public/content-images/content-images/u/1.jpg?token=xyz";
    expect(resolveActionThumbnail({ thumbPath: stale }, BASE)).toBe(`${BASE}content-images/u/1.jpg`);
  });

  it("prioritizes the first carousel image over thumb_path", () => {
    expect(
      resolveActionThumbnail(
        { thumbPath: "content-images/thumb.jpg", carouselImageUrl: "content-images/slide-1.jpg" },
        BASE,
      ),
    ).toBe(`${BASE}content-images/slide-1.jpg`);
  });

  it("returns data: URIs from image_url as-is", () => {
    const dataUri = "data:image/png;base64,AAA";
    expect(resolveActionThumbnail({ imageUrl: dataUri }, BASE)).toBe(dataUri);
  });

  it("falls back to image_url when thumb_path is empty", () => {
    expect(
      resolveActionThumbnail({ thumbPath: null, imageUrl: "u/2.jpg" }, BASE),
    ).toBe(`${BASE}u/2.jpg`);
  });

  it("returns null when there is no thumb or image", () => {
    expect(resolveActionThumbnail({}, BASE)).toBeNull();
  });
});
