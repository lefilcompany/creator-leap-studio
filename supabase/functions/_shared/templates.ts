// Shared pure logic for brand-templates edge functions.
// Kept dependency-free so it can be unit-tested without Supabase / JWT.

export const TEMPLATE_BUCKET = "brand-templates";
export const TEMPLATE_MAX_BYTES = 5 * 1024 * 1024; // 5 MB
export const TEMPLATE_MAX_PER_BRAND = 10;
export const TEMPLATE_ACCEPTED_MIME = ["application/pdf", "image/png"] as const;

export type SourceType = "pdf" | "png";

export interface TextZone {
  id: string;
  label: string;
  bbox: { x: number; y: number; w: number; h: number };
  font_family: string;
  font_weight: number;
  font_size_px: number;
  color: string;
  align: "left" | "center" | "right";
  line_height: number;
  max_chars?: number;
  original_text?: string;
}

export interface LogoSlot {
  bbox: { x: number; y: number; w: number; h: number };
  fit: "contain" | "cover";
  padding?: number;
}

export type FontAsset =
  | { source: "google"; weights: number[] }
  | { source: "custom"; font_id: string };

export type FontAssets = Record<string, FontAsset>;

export interface ImportValidationInput {
  brand_id?: unknown;
  name?: unknown;
  mime_type?: unknown;
  size_bytes?: unknown;
  pdf_page_count?: unknown;
}

export interface ImportValidationError {
  field: string;
  message: string;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}

export function validateImportRequest(
  body: ImportValidationInput,
): { ok: true; sourceType: SourceType } | { ok: false; errors: ImportValidationError[] } {
  const errors: ImportValidationError[] = [];

  if (!isUuid(body.brand_id)) {
    errors.push({ field: "brand_id", message: "brand_id deve ser um UUID válido" });
  }
  if (typeof body.name !== "string" || body.name.trim().length === 0) {
    errors.push({ field: "name", message: "name é obrigatório" });
  } else if ((body.name as string).length > 120) {
    errors.push({ field: "name", message: "name deve ter no máximo 120 caracteres" });
  }

  const mime = typeof body.mime_type === "string" ? body.mime_type : "";
  if (!TEMPLATE_ACCEPTED_MIME.includes(mime as typeof TEMPLATE_ACCEPTED_MIME[number])) {
    errors.push({
      field: "mime_type",
      message: "Apenas PDF ou PNG são aceitos",
    });
  }

  const size = typeof body.size_bytes === "number" ? body.size_bytes : -1;
  if (size <= 0) {
    errors.push({ field: "size_bytes", message: "size_bytes inválido" });
  } else if (size > TEMPLATE_MAX_BYTES) {
    errors.push({
      field: "size_bytes",
      message: `Arquivo excede o limite de ${TEMPLATE_MAX_BYTES / 1024 / 1024}MB`,
    });
  }

  if (mime === "application/pdf") {
    const pages = typeof body.pdf_page_count === "number" ? body.pdf_page_count : -1;
    if (pages !== 1) {
      errors.push({
        field: "pdf_page_count",
        message: "PDF deve conter exatamente 1 página",
      });
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, sourceType: mime === "application/pdf" ? "pdf" : "png" };
}

export function templateStoragePath(
  workspaceId: string,
  brandId: string,
  templateId: string,
  file: "source.pdf" | "source.png" | "preview.png" | "clean_background.png",
): string {
  if (!isUuid(workspaceId) || !isUuid(brandId) || !isUuid(templateId)) {
    throw new Error("IDs inválidos para path de template");
  }
  return `${workspaceId}/${brandId}/${templateId}/${file}`;
}

/**
 * Valida que toda font_family referenciada em text_zones tem entrada em font_assets.
 * Retorna lista de fontes faltantes (vazia = válido).
 */
export function findMissingFonts(
  textZones: Pick<TextZone, "font_family">[],
  fontAssets: FontAssets,
): string[] {
  const required = new Set(textZones.map((z) => z.font_family));
  const provided = new Set(Object.keys(fontAssets));
  return [...required].filter((f) => !provided.has(f));
}

/**
 * Retorna IDs de custom_fonts referenciados em font_assets (para validar acesso).
 */
export function extractCustomFontIds(fontAssets: FontAssets): string[] {
  return Object.values(fontAssets)
    .filter((a): a is Extract<FontAsset, { source: "custom" }> => a.source === "custom")
    .map((a) => a.font_id);
}

/**
 * Decide se o pedido de mock de IA pode ser atendido.
 * Política: aceita header `x-template-fake-ai: 1` APENAS quando o caller é system admin.
 */
export function shouldUseFakeAi(opts: {
  header: string | null;
  isSystemAdmin: boolean;
}): boolean {
  if (opts.header !== "1") return false;
  return opts.isSystemAdmin === true;
}
