import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Copy,
  Check,
  Sparkles,
  Zap,
  Loader2,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { CreationProgressBar } from "@/components/CreationProgressBar";
import { CarouselGallery } from "./CarouselGallery";
import { useCarouselSlides } from "@/hooks/useCarouselSlides";
import { useAuth } from "@/hooks/useAuth";
import createBanner from "@/assets/create-banner.jpg";

interface Props {
  actionId: string;
}

export function CarouselResultView({ actionId }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
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

  const handleDownloadAll = async () => {
    const ready = slides.filter((s) => s.status === "done" && s.imageUrl);
    if (ready.length === 0) {
      toast.error("Nenhum slide pronto para baixar");
      return;
    }
    for (const s of ready) {
      try {
        const r = await fetch(s.imageUrl!);
        const blob = await r.blob();
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = `slide-${s.index + 1}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(objectUrl);
      } catch {
        // continue
      }
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
    <div className="flex flex-col -m-4 sm:-m-6 lg:-m-8 min-h-full">
      {/* Banner */}
      <div className="relative h-20 md:h-24 overflow-hidden">
        <PageBreadcrumb
          items={[
            { label: "Criar Conteúdo", href: "/create" },
            { label: "Criação Personalizada", href: "/create/image" },
            { label: "Resultado" },
          ]}
          variant="overlay"
        />
        <img src={createBanner} alt="Resultado" className="w-full h-full object-cover object-center" loading="eager" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      </div>

      {/* Header Card */}
      <div className="relative px-4 sm:px-6 lg:px-8 -mt-8 z-10">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-stretch gap-3">
          <div className="bg-card rounded-2xl shadow-lg p-2.5 lg:p-3 flex items-center gap-2.5 flex-1 min-w-0">
            <div className="flex-shrink-0 bg-primary/10 text-primary rounded-xl p-2">
              <Sparkles className="h-5 w-5 lg:h-6 lg:w-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg lg:text-xl font-bold text-foreground leading-tight">
                Resultado do Carrossel
              </h1>
              <p className="text-muted-foreground text-[11px] lg:text-xs">
                {doneCount}/{total} slides prontos
                {errorCount > 0 ? ` · ${errorCount} com erro` : ""}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2 bg-gradient-to-br from-primary/10 to-secondary/10 rounded-xl px-3 py-1.5 flex-shrink-0 border border-primary/20">
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-full blur-sm opacity-40" />
                <div className="relative bg-gradient-to-r from-primary to-secondary text-white rounded-full p-1.5">
                  <Zap className="h-3.5 w-3.5" />
                </div>
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                {user?.credits || 0}
              </span>
              <span className="text-xs text-muted-foreground font-medium hidden sm:inline">Créditos</span>
            </div>
          </div>

          <div className="bg-card rounded-2xl shadow-lg p-3 lg:p-4 flex-shrink-0 flex items-center min-w-[320px]">
            <CreationProgressBar currentStep="result" />
          </div>
        </div>
      </div>

      {/* Main */}
      <main className="px-4 sm:px-6 lg:px-8 pt-6 pb-8 flex-1">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gallery card - mesma posição visual da imagem única */}
            <div className="lg:sticky lg:top-4 lg:self-start order-1 lg:order-2">
              <Card className="bg-card border-0 shadow-xl rounded-2xl overflow-hidden animate-fade-in">
                <div className="p-4">
                  <CarouselGallery actionId={actionId} carousel={carousel} />
                </div>
              </Card>
            </div>

            {/* Right column - Info & Caption */}
            <div className="space-y-5 order-2 lg:order-1">
              <h2 className="text-3xl sm:text-4xl font-extrabold leading-tight">
                <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent font-bold text-3xl">
                  Carrossel gerado{"\n"}com sucesso!
                </span>
              </h2>

              {/* Caption Card — mesmo estilo do resultado de imagem única */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-foreground">Legenda gerada:</span>
                  {captionText && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyCaption}
                      className="gap-1.5 h-8 text-xs"
                    >
                      <span className="relative h-4 w-4">
                        <Copy className={`h-4 w-4 absolute inset-0 transition-all duration-300 ${copied ? 'opacity-0 scale-75' : 'opacity-100 scale-100'}`} />
                        <Check className={`h-4 w-4 absolute inset-0 text-green-500 transition-all duration-300 ${copied ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`} />
                      </span>
                      {copied ? "Copiado" : "Copiar"}
                    </Button>
                  )}
                </div>
                <div className="backdrop-blur-2xl bg-gradient-to-br from-primary/[0.04] via-white/[0.06] to-accent/[0.04] rounded-2xl p-4 border border-primary/[0.12] shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06),inset_0_1px_0_0_rgba(255,255,255,0.15)]">
                  {carousel.caption ? (
                    <>
                      {carousel.caption.title && (
                        <h3 className="text-sm sm:text-base font-bold text-foreground mb-2">
                          {carousel.caption.title}
                        </h3>
                      )}
                      <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                        {carousel.caption.body}
                      </p>
                      {carousel.caption.hashtags && carousel.caption.hashtags.length > 0 && (
                        <div className="mt-3 pt-3 border-t border-foreground/[0.06] flex flex-wrap gap-1.5">
                          {carousel.caption.hashtags.map((tag, index) => (
                            <span
                              key={index}
                              className="text-[10px] text-primary font-medium backdrop-blur-sm bg-primary/[0.08] border border-primary/[0.1] px-2 py-0.5 rounded-md shadow-[inset_0_0.5px_0_0_rgba(255,255,255,0.08)]"
                            >
                              {tag.startsWith("#") ? tag : `#${tag}`}
                            </span>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {allDone
                        ? "Gerando legenda do carrossel..."
                        : "A legenda será gerada automaticamente quando os slides ficarem prontos."}
                    </div>
                  )}
                </div>
              </div>

              {/* Status info */}
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {allDone ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-green-500" />
                    <span>Todos os {total} slides foram gerados</span>
                  </>
                ) : (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Gerando slides em paralelo... ({doneCount}/{total})</span>
                  </>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-2 w-full sm:w-1/2">
                <Button
                  onClick={handleDownloadAll}
                  disabled={doneCount === 0}
                  className="gap-2 h-10 w-full text-sm font-semibold"
                >
                  <Download className="h-4 w-4" />
                  Baixar todos
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
