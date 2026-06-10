import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  cacheKey,
  googleFontsCssUrl,
  pickFontUrlFromCss,
  resolveFont,
  type FontFetchers,
} from "./templateFontCache.ts";

Deno.test("cacheKey: google", () => {
  assertEquals(cacheKey({ family: "Inter", weight: 700, source: "google" }), "google/inter-700.ttf");
  assertEquals(
    cacheKey({ family: "Playfair Display", weight: 400, source: "google" }),
    "google/playfair-display-400.ttf",
  );
});

Deno.test("cacheKey: custom", () => {
  assertEquals(
    cacheKey({ family: "X", weight: 500, source: "custom", fontId: "abc-123" }),
    "custom/abc-123.ttf",
  );
});

Deno.test("googleFontsCssUrl: encoda família", () => {
  assertEquals(
    googleFontsCssUrl("Playfair Display", 700),
    "https://fonts.googleapis.com/css2?family=Playfair%20Display:wght@700&display=swap",
  );
});

Deno.test("pickFontUrlFromCss: prefere TTF", () => {
  const css = `
    src: url(https://x/a.woff2) format('woff2');
    src: url(https://x/b.ttf) format('truetype');
  `;
  assertEquals(pickFontUrlFromCss(css), "https://x/b.ttf");
});

Deno.test("pickFontUrlFromCss: fallback ao primeiro", () => {
  const css = `src: url(https://x/a.woff2) format('woff2');`;
  assertEquals(pickFontUrlFromCss(css), "https://x/a.woff2");
});

Deno.test("pickFontUrlFromCss: null se não houver match", () => {
  assertEquals(pickFontUrlFromCss(""), null);
});

function makeFetchers(initial: {
  bucket?: Record<string, Uint8Array>;
  google?: (family: string, weight: number) => Uint8Array;
  custom?: (id: string) => Uint8Array;
} = {}): { f: FontFetchers; spy: { googleCalls: number; bucketWrites: number } } {
  const mem = new Map<string, Uint8Array>();
  const bucket = new Map<string, Uint8Array>(Object.entries(initial.bucket ?? {}));
  const spy = { googleCalls: 0, bucketWrites: 0 };
  const f: FontFetchers = {
    fromMemory: (k) => mem.get(k),
    putMemory: (k, b) => void mem.set(k, b),
    fromBucket: async (k) => bucket.get(k) ?? null,
    putBucket: async (k, b) => {
      bucket.set(k, b);
      spy.bucketWrites++;
    },
    fromGoogle: async (family, weight) => {
      spy.googleCalls++;
      return initial.google?.(family, weight) ?? new Uint8Array([1, 2, 3]);
    },
    fromCustom: async (id) => initial.custom?.(id) ?? new Uint8Array([4, 5, 6]),
  };
  return { f, spy };
}

Deno.test("resolveFont: miss total → busca Google, grava em bucket e memória", async () => {
  const { f, spy } = makeFetchers();
  const bytes = await resolveFont({ family: "Inter", weight: 400, source: "google" }, f);
  assertEquals(bytes, new Uint8Array([1, 2, 3]));
  assertEquals(spy.googleCalls, 1);
  assertEquals(spy.bucketWrites, 1);
});

Deno.test("resolveFont: hit no bucket evita Google", async () => {
  const { f, spy } = makeFetchers({
    bucket: { "google/inter-400.ttf": new Uint8Array([9]) },
  });
  const bytes = await resolveFont({ family: "Inter", weight: 400, source: "google" }, f);
  assertEquals(bytes, new Uint8Array([9]));
  assertEquals(spy.googleCalls, 0);
  assertEquals(spy.bucketWrites, 0);
});

Deno.test("resolveFont: custom resolve via fromCustom", async () => {
  const { f, spy } = makeFetchers({ custom: (id) => new Uint8Array([id.length]) });
  const bytes = await resolveFont(
    { family: "X", weight: 500, source: "custom", fontId: "abc" },
    f,
  );
  assertEquals(bytes, new Uint8Array([3]));
  assertEquals(spy.googleCalls, 0);
  assertEquals(spy.bucketWrites, 1);
});

Deno.test("resolveFont: segunda chamada usa memória", async () => {
  const { f, spy } = makeFetchers();
  await resolveFont({ family: "Inter", weight: 400, source: "google" }, f);
  await resolveFont({ family: "Inter", weight: 400, source: "google" }, f);
  assertEquals(spy.googleCalls, 1);
});
