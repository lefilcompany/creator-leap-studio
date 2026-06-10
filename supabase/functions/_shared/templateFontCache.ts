/**
 * Cache de fontes para o pipeline de Templates.
 *
 * Camadas:
 *   1. Memória (Map) por invocação — `inMemory`.
 *   2. Bucket privado `template-fonts` no Supabase Storage.
 *   3. Google Fonts API (origem).
 *
 * Para fontes custom (font_assets.source === "custom"), a origem é o bucket
 * público `custom-fonts`, e a chave de cache inclui o font_id.
 */

export const FONT_BUCKET = "template-fonts";

export type FontKey = { family: string; weight: number; source: "google" | "custom"; fontId?: string };

const inMemory = new Map<string, Uint8Array>();

export function cacheKey(k: FontKey): string {
  if (k.source === "custom") return `custom/${k.fontId}.ttf`;
  return `google/${slug(k.family)}-${k.weight}.ttf`;
}

export function googleFontsCssUrl(family: string, weight: number): string {
  const f = encodeURIComponent(family);
  return `https://fonts.googleapis.com/css2?family=${f}:wght@${weight}&display=swap`;
}

/**
 * Extrai a primeira URL `.ttf`/`.otf`/`.woff2` de uma resposta CSS do Google Fonts.
 * Prefere TTF (compatível com @napi-rs/canvas).
 */
export function pickFontUrlFromCss(css: string): string | null {
  const matches = [...css.matchAll(/src:\s*url\(([^)]+)\)\s*format\((['"])(\w+)\2\)/g)];
  // Preferência: ttf > opentype > woff2.
  const order = ["truetype", "opentype", "woff2"];
  for (const fmt of order) {
    const m = matches.find((x) => x[3] === fmt);
    if (m) return m[1].replace(/['"]/g, "");
  }
  return matches[0]?.[1]?.replace(/['"]/g, "") ?? null;
}

function slug(s: string): string {
  return s.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export interface FontFetchers {
  fromMemory(key: string): Uint8Array | undefined;
  putMemory(key: string, bytes: Uint8Array): void;
  fromBucket(key: string): Promise<Uint8Array | null>;
  putBucket(key: string, bytes: Uint8Array): Promise<void>;
  fromGoogle(family: string, weight: number): Promise<Uint8Array>;
  fromCustom(fontId: string): Promise<Uint8Array>;
}

/**
 * Resolve uma fonte usando as 3 camadas. Persiste na camada de memória sempre
 * e no bucket quando a origem foi a Google Fonts (custom já vem do bucket).
 */
export async function resolveFont(
  k: FontKey,
  f: FontFetchers,
): Promise<Uint8Array> {
  const key = cacheKey(k);
  const mem = f.fromMemory(key);
  if (mem) return mem;

  const bucket = await f.fromBucket(key);
  if (bucket) {
    f.putMemory(key, bucket);
    return bucket;
  }

  const fresh = k.source === "google"
    ? await f.fromGoogle(k.family, k.weight)
    : await f.fromCustom(k.fontId!);
  await f.putBucket(key, fresh);
  f.putMemory(key, fresh);
  return fresh;
}

export const __memCache = inMemory;
