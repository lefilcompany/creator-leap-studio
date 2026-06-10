import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { TemplateTextZone, TemplateLogoSlot, TemplateFontAssets } from "@/types/template";
import { isGoogleFont } from "@/lib/googleFonts";

export interface CommitTemplateInput {
  brand_id: string;
  template_id: string;
  text_zones: TemplateTextZone[];
  logo_slot: TemplateLogoSlot | null;
  font_assets: TemplateFontAssets;
}

/** Build a default font_assets entry from a font family, marking Google fonts with weight 400/700. */
export function defaultFontAssetsFromZones(
  zones: TemplateTextZone[],
  existing: TemplateFontAssets = {},
): TemplateFontAssets {
  const out: TemplateFontAssets = { ...existing };
  for (const z of zones) {
    if (out[z.font_family]) continue;
    if (isGoogleFont(z.font_family)) {
      out[z.font_family] = { source: "google", weights: [400, 700] };
    }
  }
  return out;
}

export function useCommitTemplate() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, CommitTemplateInput>({
    mutationFn: async ({ template_id, text_zones, logo_slot, font_assets }) => {
      const { error } = await supabase.functions.invoke("commit-brand-template", {
        body: { template_id, text_zones, logo_slot, font_assets },
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ["brand-templates", vars.brand_id] });
    },
  });
}
