import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CarouselResult } from "@/components/create-content/carousel/types";

export function useCarouselSlides(actionId?: string) {
  return useQuery({
    queryKey: ["carousel-slides", actionId],
    enabled: !!actionId,
    refetchInterval: (query) => {
      const data = query.state.data as CarouselResult | undefined;
      if (!data?.slides?.length) return 3000;
      const hasPending = data.slides.some(
        (s) => s?.status === "pending" || s?.status === "generating"
      );
      return hasPending ? 3000 : false;
    },
    queryFn: async (): Promise<CarouselResult | null> => {
      if (!actionId) return null;
      const { data, error } = await supabase
        .from("actions")
        .select("result")
        .eq("id", actionId)
        .single();
      if (error) throw error;
      const carousel = (data?.result as any)?.carousel;
      return carousel ?? null;
    },
  });
}
