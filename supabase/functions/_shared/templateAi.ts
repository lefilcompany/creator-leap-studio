/**
 * Cliente Gemini para o pipeline de Templates (ADR 0003).
 *
 * Regras:
 *  - 4xx → fail-fast (sem retry).
 *  - 429/5xx → backoff exponencial (3 tentativas), respeita `Retry-After`.
 *  - Vision: gemini-2.5-flash (JSON estrito).
 *  - Inpainting/edição: gemini-3-pro-image-preview.
 *  - Geração de fundo (Branch B): gemini-3.1-flash-image-preview.
 *
 * As funções de baixo nível (`callGeminiWithRetry`, `extractInlineImage`)
 * são testáveis isoladamente via fetch mock.
 */

export const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta";
export const VISION_MODEL = "gemini-2.5-flash";
export const INPAINT_MODEL = "gemini-3-pro-image-preview";
export const IMAGE_GEN_MODEL = "gemini-3.1-flash-image-preview";

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
}

export class AiHttpError extends Error {
  constructor(public status: number, public bodyText: string) {
    super(`Gemini HTTP ${status}: ${bodyText.slice(0, 200)}`);
  }
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Chama o Gemini com backoff exponencial em 5xx/429, fail-fast em 4xx.
 * Retorna a resposta JSON parseada do provider.
 */
export async function callGeminiWithRetry(
  url: string,
  init: RequestInit,
  opts: RetryOptions = {},
): Promise<any> {
  const maxAttempts = opts.maxAttempts ?? 3;
  const base = opts.baseDelayMs ?? 500;
  const fetcher = opts.fetchImpl ?? fetch;
  const sleep = opts.sleep ?? defaultSleep;

  let attempt = 0;
  let lastErr: unknown;
  while (attempt < maxAttempts) {
    attempt++;
    const res = await fetcher(url, init);
    if (res.ok) {
      return await res.json();
    }
    const bodyText = await res.text();
    // 4xx (exceto 429) → fail-fast.
    if (res.status >= 400 && res.status < 500 && res.status !== 429) {
      throw new AiHttpError(res.status, bodyText);
    }
    lastErr = new AiHttpError(res.status, bodyText);

    if (attempt >= maxAttempts) break;

    const retryAfter = Number(res.headers.get("retry-after") ?? "0");
    const delay = retryAfter > 0 ? retryAfter * 1000 : base * Math.pow(2, attempt - 1);
    await sleep(delay);
  }
  throw lastErr ?? new Error("Gemini: retry exhausted");
}

/**
 * Extrai a primeira imagem inline (`inlineData`) de uma resposta Gemini.
 * Retorna `{ mimeType, base64 }` ou null.
 */
export function extractInlineImage(
  raw: any,
): { mimeType: string; base64: string } | null {
  const parts = raw?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return null;
  for (const p of parts) {
    const inline = p?.inlineData ?? p?.inline_data;
    if (inline?.data) {
      return { mimeType: inline.mimeType ?? inline.mime_type ?? "image/png", base64: inline.data };
    }
  }
  return null;
}

/**
 * Extrai texto da resposta Gemini (concatenando todas as parts text).
 */
export function extractText(raw: any): string {
  const parts = raw?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts.map((p: any) => p?.text ?? "").join("").trim();
}
