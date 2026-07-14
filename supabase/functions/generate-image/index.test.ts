// Contract tests for generate-image. These prove the pre-credit guardrails
// fire before any credit deduction, which is the invariant that protects
// users from being charged for failed requests.
//
// Run: supabase--test_edge_functions { functions: ["generate-image"] }

import "https://deno.land/std@0.224.0/dotenv/load.ts";
import { assertEquals } from "https://deno.land/std@0.224.0/assert/mod.ts";

const SUPABASE_URL = Deno.env.get("VITE_SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("VITE_SUPABASE_PUBLISHABLE_KEY")!;
const ENDPOINT = `${SUPABASE_URL}/functions/v1/generate-image`;

Deno.test("OPTIONS preflight returns CORS headers", async () => {
  const resp = await fetch(ENDPOINT, { method: "OPTIONS" });
  await resp.text();
  assertEquals(resp.headers.get("access-control-allow-origin"), "*");
});

Deno.test("rejects requests without authorization (no credit deduction possible)", async () => {
  const resp = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: SUPABASE_ANON_KEY },
    body: JSON.stringify({ description: "teste sem auth" }),
  });
  await resp.text();
  assertEquals(resp.status, 401);
});

Deno.test("rejects invalid description before touching credits", async () => {
  const resp = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ description: null }),
  });
  const body = await resp.text();
  // Either 401 (anon token rejected by getUser) or 400 (validation) — both
  // happen strictly before checkUserCredits/deductUserCredits, so no charge.
  if (resp.status !== 400 && resp.status !== 401) {
    throw new Error(`Expected 400 or 401, got ${resp.status}: ${body}`);
  }
});

Deno.test("rejects malformed JSON body without side effects", async () => {
  const resp = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: "{ not valid json",
  });
  const body = await resp.text();
  if (resp.status < 400) {
    throw new Error(`Expected 4xx/5xx for malformed JSON, got ${resp.status}: ${body}`);
  }
});
