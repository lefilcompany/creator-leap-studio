import {
  assertEquals,
  assertStrictEquals,
  assertThrows,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  extractCustomFontIds,
  findMissingFonts,
  shouldUseFakeAi,
  templateStoragePath,
  TEMPLATE_MAX_BYTES,
  validateImportRequest,
} from "./templates.ts";

const UUID_A = "11111111-1111-1111-1111-111111111111";
const UUID_B = "22222222-2222-2222-2222-222222222222";
const UUID_C = "33333333-3333-3333-3333-333333333333";

Deno.test("validateImportRequest rejects missing brand_id", () => {
  const r = validateImportRequest({
    name: "Template A",
    mime_type: "image/png",
    size_bytes: 1024,
  });
  assertEquals(r.ok, false);
  if (!r.ok) {
    assertEquals(r.errors[0].field, "brand_id");
  }
});

Deno.test("validateImportRequest rejects unsupported mime", () => {
  const r = validateImportRequest({
    brand_id: UUID_A,
    name: "x",
    mime_type: "image/jpeg",
    size_bytes: 100,
  });
  assertEquals(r.ok, false);
  if (!r.ok) {
    assertEquals(
      r.errors.some((e) => e.field === "mime_type"),
      true,
    );
  }
});

Deno.test("validateImportRequest rejects oversize files", () => {
  const r = validateImportRequest({
    brand_id: UUID_A,
    name: "x",
    mime_type: "image/png",
    size_bytes: TEMPLATE_MAX_BYTES + 1,
  });
  assertEquals(r.ok, false);
  if (!r.ok) {
    assertEquals(r.errors[0].field, "size_bytes");
  }
});

Deno.test("validateImportRequest requires pdf with exactly 1 page", () => {
  const r = validateImportRequest({
    brand_id: UUID_A,
    name: "x",
    mime_type: "application/pdf",
    size_bytes: 1024,
    pdf_page_count: 3,
  });
  assertEquals(r.ok, false);
  if (!r.ok) {
    assertEquals(r.errors[0].field, "pdf_page_count");
  }
});

Deno.test("validateImportRequest accepts valid PNG", () => {
  const r = validateImportRequest({
    brand_id: UUID_A,
    name: "Banner",
    mime_type: "image/png",
    size_bytes: 1024,
  });
  assertEquals(r.ok, true);
  if (r.ok) assertEquals(r.sourceType, "png");
});

Deno.test("validateImportRequest accepts valid 1-page PDF", () => {
  const r = validateImportRequest({
    brand_id: UUID_A,
    name: "Banner",
    mime_type: "application/pdf",
    size_bytes: 1024,
    pdf_page_count: 1,
  });
  assertEquals(r.ok, true);
  if (r.ok) assertEquals(r.sourceType, "pdf");
});

Deno.test("templateStoragePath builds expected layout", () => {
  assertEquals(
    templateStoragePath(UUID_A, UUID_B, UUID_C, "source.png"),
    `${UUID_A}/${UUID_B}/${UUID_C}/source.png`,
  );
});

Deno.test("templateStoragePath rejects non-uuid", () => {
  assertThrows(() => templateStoragePath("bad", UUID_B, UUID_C, "preview.png"));
});

Deno.test("findMissingFonts lists fonts without asset", () => {
  const missing = findMissingFonts(
    [{ font_family: "Inter" }, { font_family: "BrandSans" }],
    { Inter: { source: "google", weights: [400] } },
  );
  assertEquals(missing, ["BrandSans"]);
});

Deno.test("findMissingFonts returns empty when complete", () => {
  const missing = findMissingFonts(
    [{ font_family: "Inter" }],
    { Inter: { source: "google", weights: [400] } },
  );
  assertEquals(missing.length, 0);
});

Deno.test("extractCustomFontIds returns only custom sources", () => {
  const ids = extractCustomFontIds({
    Inter: { source: "google", weights: [400] },
    BrandSans: { source: "custom", font_id: UUID_C },
  });
  assertEquals(ids, [UUID_C]);
});

Deno.test("shouldUseFakeAi requires system admin", () => {
  assertStrictEquals(shouldUseFakeAi({ header: "1", isSystemAdmin: false }), false);
  assertStrictEquals(shouldUseFakeAi({ header: "1", isSystemAdmin: true }), true);
  assertStrictEquals(shouldUseFakeAi({ header: null, isSystemAdmin: true }), false);
});
