import { assertEquals, assertRejects } from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  AiHttpError,
  callGeminiWithRetry,
  extractInlineImage,
  extractText,
} from "./templateAi.ts";

function makeFetch(responses: Array<{ status: number; body?: string; headers?: Record<string, string> }>) {
  let i = 0;
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const f = (url: any, init?: any) => {
    calls.push({ url: String(url), init });
    const r = responses[Math.min(i, responses.length - 1)];
    i++;
    return Promise.resolve(
      new Response(r.body ?? "{}", {
        status: r.status,
        headers: r.headers ?? {},
      }),
    );
  };
  return { fetch: f as unknown as typeof fetch, calls };
}

Deno.test("callGeminiWithRetry: 4xx fails fast (no retry)", async () => {
  const { fetch, calls } = makeFetch([{ status: 400, body: "bad" }]);
  let slept = 0;
  await assertRejects(
    () =>
      callGeminiWithRetry("https://x", { method: "POST" }, {
        fetchImpl: fetch,
        sleep: async () => {
          slept++;
        },
      }),
    AiHttpError,
  );
  assertEquals(calls.length, 1);
  assertEquals(slept, 0);
});

Deno.test("callGeminiWithRetry: 429 retries with backoff", async () => {
  const { fetch, calls } = makeFetch([
    { status: 429 },
    { status: 429 },
    { status: 200, body: JSON.stringify({ ok: true }) },
  ]);
  const sleeps: number[] = [];
  const data = await callGeminiWithRetry("https://x", { method: "POST" }, {
    fetchImpl: fetch,
    baseDelayMs: 10,
    sleep: async (ms) => {
      sleeps.push(ms);
    },
  });
  assertEquals(data, { ok: true });
  assertEquals(calls.length, 3);
  assertEquals(sleeps, [10, 20]);
});

Deno.test("callGeminiWithRetry: 5xx exhausts attempts", async () => {
  const { fetch, calls } = makeFetch([
    { status: 500 },
    { status: 502 },
    { status: 503 },
  ]);
  await assertRejects(
    () =>
      callGeminiWithRetry("https://x", { method: "POST" }, {
        fetchImpl: fetch,
        baseDelayMs: 1,
        sleep: async () => {},
        maxAttempts: 3,
      }),
    AiHttpError,
  );
  assertEquals(calls.length, 3);
});

Deno.test("callGeminiWithRetry: respeita Retry-After", async () => {
  const { fetch } = makeFetch([
    { status: 429, headers: { "retry-after": "2" } },
    { status: 200, body: "{}" },
  ]);
  const sleeps: number[] = [];
  await callGeminiWithRetry("https://x", { method: "POST" }, {
    fetchImpl: fetch,
    baseDelayMs: 10,
    sleep: async (ms) => {
      sleeps.push(ms);
    },
  });
  assertEquals(sleeps, [2000]);
});

Deno.test("extractInlineImage: pega primeira inlineData", () => {
  const raw = {
    candidates: [{
      content: {
        parts: [
          { text: "hi" },
          { inlineData: { mimeType: "image/png", data: "AAAA" } },
        ],
      },
    }],
  };
  assertEquals(extractInlineImage(raw), { mimeType: "image/png", base64: "AAAA" });
});

Deno.test("extractInlineImage: snake_case também", () => {
  const raw = {
    candidates: [{
      content: { parts: [{ inline_data: { mime_type: "image/png", data: "BBBB" } }] },
    }],
  };
  assertEquals(extractInlineImage(raw), { mimeType: "image/png", base64: "BBBB" });
});

Deno.test("extractInlineImage: null quando ausente", () => {
  assertEquals(extractInlineImage({ candidates: [{ content: { parts: [{ text: "x" }] } }] }), null);
});

Deno.test("extractText: concatena partes text", () => {
  const raw = {
    candidates: [{
      content: { parts: [{ text: "A" }, { text: "B" }] },
    }],
  };
  assertEquals(extractText(raw), "AB");
});
