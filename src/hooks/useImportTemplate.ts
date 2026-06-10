import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { rasterizePdf, imageFileToPng, type RasterizedPdf } from "@/lib/rasterizePdf";
import type { TemplateTextZone, TemplateLogoSlot } from "@/types/template";

const MAX_BYTES = 5 * 1024 * 1024;

export interface ImportTemplateResult {
  template_id: string;
  text_zones: TemplateTextZone[];
  logo_slot: TemplateLogoSlot | null;
  preview_url: string;
  width: number;
  height: number;
}

export interface ImportInput {
  brand_id: string;
  name: string;
  file: File;
}

export function validateImportFile(file: File): string | null {
  if (file.size > MAX_BYTES) return "Arquivo excede 5MB";
  if (file.type !== "application/pdf" && file.type !== "image/png" && file.type !== "image/jpeg")
    return "Apenas PDF, PNG ou JPG";
  return null;
}

async function prepare(file: File): Promise<RasterizedPdf> {
  if (file.type === "application/pdf") return rasterizePdf(file);
  return imageFileToPng(file);
}

export function useImportTemplate() {
  return useMutation<ImportTemplateResult, Error, ImportInput>({
    mutationFn: async ({ brand_id, name, file }) => {
      const err = validateImportFile(file);
      if (err) throw new Error(err);

      const rast = await prepare(file);

      const { data, error } = await supabase.functions.invoke("import-brand-template", {
        body: {
          brand_id,
          name: name.trim(),
          mime_type: file.type === "application/pdf" ? "application/pdf" : "image/png",
          size_bytes: file.size,
          pdf_page_count: file.type === "application/pdf" ? rast.pageCount : undefined,
          image_base64: rast.pngBase64,
          width: rast.width,
          height: rast.height,
        },
      });
      if (error) throw error;
      if (!data?.template_id) throw new Error("Resposta inválida do servidor");
      return data as ImportTemplateResult;
    },
  });
}
