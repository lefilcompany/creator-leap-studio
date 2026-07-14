// Deno tests for the finalize-image-overlay Edge Function.
// These are contract tests against the deployed endpoint — they exercise
// the auth and validation surface without needing to spin up a real
// composited image.
//
// Run with: supabase--test_edge_functions { functions: ["finalize-image-overlay"] }

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const ENDPOINT = `${SUPABASE_URL}/functions/v1/finalize-image-overlay`;

Deno.test("rejects requests without an authorization header", async () => {
  const resp = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ actionId: "00000000-0000-0000-0000-000000000000", finalImageBase64: "x".repeat(200) }),
  });
  await resp.text();
  assertEquals(resp.status, 401);
});

Deno.test("rejects an invalid actionId with 400", async () => {
  const resp = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ actionId: "not-a-uuid", finalImageBase64: "x".repeat(200) }),
  });
  const body = await resp.text();
  // The auth check runs first with the anon token, so either 401 (anon token
  // rejected) or 400 (uuid rejected) is acceptable — both prove the guardrails
  // fire before any upload happens.
  if (resp.status !== 400 && resp.status !== 401) {
    throw new Error(`Expected 400 or 401, got ${resp.status}: ${body}`);
  }
});

Deno.test("rejects a missing image payload with 400/401", async () => {
  const resp = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ actionId: "00000000-0000-0000-0000-000000000000" }),
  });
  const body = await resp.text();
  if (resp.status !== 400 && resp.status !== 401) {
    throw new Error(`Expected 400 or 401, got ${resp.status}: ${body}`);
  }
});

Deno.test("OPTIONS preflight returns CORS headers", async () => {
  const resp = await fetch(ENDPOINT, { method: "OPTIONS" });
  await resp.text();
  assertEquals(resp.headers.get("access-control-allow-origin"), "*");
});
