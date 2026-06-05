import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { CarouselResult } from "@/components/create-content/carousel/types";

/**
 * Gera uma "assinatura" estável do carrossel para que o React Query
 * só substitua o objeto retornado quando algo realmente mudar.
 * Isso evita re-renders desnecessários (e o flicker da legenda) a cada poll.
 */
function carouselSignature(c: CarouselResult | null | undefined): string {
  if (!c) return "null";
  const slidesSig = (c.slides ?? [])
    .map((s) => `${s?.index}:${s?.status ?? ""}:${s?.imageUrl ?? ""}:${s?.error ?? ""}`)
    .join("|");
  const cap = c.caption;
  const capSig = cap
    ? `${cap.title ?? ""}::${cap.body ?? ""}::${(cap.hashtags ?? []).join(",")}`
    : "";
  return `${c.slidesCount ?? 0}#${slidesSig}#${capSig}`;
}

export function useCarouselSlides(actionId?: string) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: ["carousel-slides", actionId],
    enabled: !!actionId,
    placeholderData: keepPreviousData,
    // Compara por assinatura: se o conteúdo é o mesmo, mantém a referência
    // antiga e o React não re-renderiza consumidores que dependem de `carousel`.
    structuralSharing: (oldData, newData) => {
      const oldSig = carouselSignature(oldData as CarouselResult | null | undefined);
      const newSig = carouselSignature(newData as CarouselResult | null | undefined);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: tipar adequadamente
      if (oldSig === newSig && oldData) return oldData as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: tipar adequadamente
      return newData as any;
    },
    refetchInterval: (query) => {
      const data = query.state.data as CarouselResult | undefined;
      if (!data?.slides?.length) return 3000;
      const hasPending = data.slides.some(
        (s) => s?.status === "pending" || s?.status === "generating"
      );
      const hasAnyDone = data.slides.some((s) => s?.status === "done");
      const captionMissing = hasAnyDone && !data.caption;
      if (hasPending || captionMissing) return 5000;
      return false;
    },
    queryFn: async (): Promise<CarouselResult | null> => {
      if (!actionId) return null;
      const { data, error } = await supabase
        .from("actions")
        .select("result")
        .eq("id", actionId)
        .single();
      if (error) throw error;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TODO: tipar adequadamente
      const carousel = (data?.result as any)?.carousel as CarouselResult | undefined;
      if (!carousel) return null;

      // Preserva status otimista "generating" definido pelo cliente
      // (ex.: ao pedir regeração de um slide) enquanto o servidor ainda
      // não trocou a imagem. Sem isso, o refetch logo após o pedido
      // sobrescreve o status para "done" antigo, o overlay some e o
      // polling para — usuário fica achando que nada está acontecendo.
      const prev = queryClient.getQueryData<CarouselResult | null>([
        "carousel-slides",
        actionId,
      ]);
      if (prev?.slides?.length) {
        const merged = (carousel.slides ?? []).map((s) => {
          const old = prev.slides?.find((p) => p?.index === s?.index);
          if (
            old?.status === "generating" &&
            s?.status === "done" &&
            old?.imageUrl &&
            s?.imageUrl === old.imageUrl
          ) {
            // Servidor ainda não atualizou — mantém "generating"
            return { ...s, status: "generating" as const, error: null };
          }
          return s;
        });
        return { ...carousel, slides: merged };
      }
      return carousel;
    },
  });
}
