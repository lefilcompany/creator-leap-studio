import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { BrandTemplate } from "@/types/template";

const BUCKET = "brand-templates";

async function signPreview(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600);
  if (error) return null;
  return data.signedUrl;
}

export function useBrandTemplates(brandId: string | undefined) {
  const queryClient = useQueryClient();

  const list = useQuery<BrandTemplate[]>({
    queryKey: ["brand-templates", brandId],
    enabled: !!brandId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brand_templates")
        .select("*")
        .eq("brand_id", brandId!)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as unknown as BrandTemplate[];
      // Resolve preview URLs (parallel, best-effort).
      const withUrls = await Promise.all(
        rows.map(async (r) => ({ ...r, preview_url: await signPreview(r.preview_path) })),
      );
      return withUrls;
    },
  });

  const softDelete = useMutation({
    mutationFn: async (templateId: string) => {
      const { error } = await supabase.functions.invoke("delete-brand-template", {
        body: { template_id: templateId },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["brand-templates", brandId] });
    },
  });

  return { list, softDelete };
}
