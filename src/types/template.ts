export interface TemplateBBox {
  x: number; // 0..1
  y: number;
  w: number;
  h: number;
}

export interface TemplateTextZone {
  id: string;
  label: string;
  bbox: TemplateBBox;
  font_family: string;
  font_weight: number;
  font_size_px: number;
  color: string;
  align: "left" | "center" | "right";
  line_height: number;
  max_chars?: number;
  original_text?: string;
}

export interface TemplateLogoSlot {
  bbox: TemplateBBox;
  fit: "contain" | "cover";
  padding?: number;
}

export type TemplateFontAsset =
  | { source: "google"; weights: number[] }
  | { source: "custom"; font_id: string };

export type TemplateFontAssets = Record<string, TemplateFontAsset>;

export interface BrandTemplate {
  id: string;
  brand_id: string;
  workspace_id: string;
  name: string;
  status: "draft" | "ready";
  preview_path: string | null;
  preview_url?: string | null;
  clean_background_path: string | null;
  width: number;
  height: number;
  text_zones: TemplateTextZone[];
  logo_slot: TemplateLogoSlot | null;
  font_assets: TemplateFontAssets;
  created_at: string;
}

export interface TemplateFillInput {
  zone_id: string;
  value: string;
}
