import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Copy, Check, ArrowLeft, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { CarouselGallery } from "./CarouselGallery";
import { useCarouselSlides } from "@/hooks/useCarouselSlides";

interface Props {
  actionId: string;
}

export function CarouselResultView({ actionId }: Props) {
  const navigate = useNavigate();
  const { data: carousel, isLoading } = useCarouselSlides(actionId);
  const [copied, setCopied] = useState(false);

  const slides = carousel?.slides ?? [];
  const total = carousel?.slidesCount ?? slides.length;
  const doneCount = slides.filter((s) => s.status === "done").length;
  const errorCount = slides.filter((s) => s.status === "error").length;
  const allDone = total > 0 && doneCount === total;

  const captionText = useMemo(() => {
    const c = carousel?.caption;
    if (!c?.title || !c?.body) return "";
    const tags = (c.hashtags ?? []).map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" ");
    return `${c.title}\n\n${c.body}${tags ? `\n\n${tags}` : ""}`;
  }, [carousel?.caption]);

  const handleCopyCaption = async () => {
    if (!captionText) return;
    try {
      await navigator.clipboard.writeText(captionText);
      setCopied(true);
      toast.success("Legenda copiada");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  if (isLoading && !carousel) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!carousel) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <p className="text-sm text-muted-foreground">Carrossel não encontrado.</p>
        <Button variant="outline" onClick={() => navigate("/create")}>Voltar</Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div className="hidden sm:block">
        <PageBreadcrumb
          items={[
            { label: "Criar conteúdo", href: "/create" },
            { label: "Carrossel" },
          ]}
        />
      </div>

      <div className="rounded-2xl bg-card shadow-xl border border-border/40 p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" className="sm:hidden" onClick={() => navigate("/create")}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
            </Button>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Carrossel
            </h1>
            <Badge variant="secondary" className="font-bold">
              {doneCount}/{total} prontos
              {errorCount > 0 ? ` · ${errorCount} com erro` : ""}
            </Badge>
          </div>
          {!allDone && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Gerando em paralelo...
            </div>
          )}
        </div>

        <CarouselGallery actionId={actionId} carousel={carousel} />
      </div>

      <div className="rounded-2xl bg-card shadow-xl border border-border/40 p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold">Legenda sugerida</h2>
          {captionText && (
            <Button size="sm" variant="outline" onClick={handleCopyCaption}>
              {copied ? <Check className="h-3.5 w-3.5 mr-1" /> : <Copy className="h-3.5 w-3.5 mr-1" />}
              {copied ? "Copiado" : "Copiar"}
            </Button>
          )}
        </div>

        {carousel.caption ? (
          <div className="space-y-3">
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Título</p>
              <p className="text-sm font-semibold">{carousel.caption.title}</p>
            </div>
            <div>
              <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Corpo</p>
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{carousel.caption.body}</p>
            </div>
            {carousel.caption.hashtags?.length ? (
              <div>
                <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Hashtags</p>
                <p className="text-sm text-primary">
                  {carousel.caption.hashtags.map((t) => (t.startsWith("#") ? t : `#${t}`)).join(" ")}
                </p>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            {allDone
              ? "Gerando legenda do carrossel..."
              : "A legenda será gerada automaticamente quando todos os slides ficarem prontos."}
          </div>
        )}
      </div>
    </div>
  );
}
