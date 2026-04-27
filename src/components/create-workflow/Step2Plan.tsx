import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Check, Hash, Image as ImageIcon, Lightbulb, MessageSquare, Loader2 } from "lucide-react";
import { ContentTemplate } from "./types";
import { cn } from "@/lib/utils";

interface Step2PlanProps {
  templates: ContentTemplate[];
  selectedTemplateId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
  generatingMore: boolean;
  onGenerateMore: () => void;
}

export function Step2Plan({
  templates, selectedTemplateId, onSelect, loading, generatingMore, onGenerateMore,
}: Step2PlanProps) {
  if (loading && templates.length === 0) {
    return (
      <div className="space-y-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold">Gerando seu template...</h2>
          <p className="text-sm text-muted-foreground mt-1">
            A IA está montando uma direção completa de imagem e legenda.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold">
            {templates.length > 1 ? "Escolha um template" : "Seu template"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {templates.length > 1
              ? "Compare as opções e selecione a que mais combina com sua ideia."
              : "Você pode usar este template ou pedir alternativas."}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onGenerateMore}
          disabled={generatingMore}
          className="gap-2"
        >
          {generatingMore
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : <Sparkles className="h-4 w-4" />}
          {generatingMore ? "Gerando..." : "Gerar 2 alternativas"}
        </Button>
      </div>

      <div className={cn(
        "grid gap-4",
        templates.length === 1 ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2",
      )}>
        {templates.map(t => {
          const selected = t.id === selectedTemplateId;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => onSelect(t.id)}
              className={cn(
                "group text-left rounded-2xl border-2 p-5 transition-all bg-card",
                selected
                  ? "border-primary ring-2 ring-primary/20 shadow-lg"
                  : "border-border hover:border-primary/40 hover:shadow-md",
              )}
            >
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                    {t.format}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {t.visualDirection.aspectRatio}
                  </Badge>
                </div>
                {selected && (
                  <div className="bg-primary text-primary-foreground rounded-full p-1 flex-shrink-0">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                )}
              </div>

              <h3 className="font-bold text-base text-foreground mb-2 line-clamp-2">
                {t.title}
              </h3>

              {t.bigIdea && (
                <div className="flex items-start gap-2 mb-3">
                  <Lightbulb className="h-3.5 w-3.5 text-primary flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-muted-foreground italic line-clamp-2">
                    {t.bigIdea}
                  </p>
                </div>
              )}

              <div className="space-y-2.5 text-xs">
                <div className="flex items-start gap-2">
                  <ImageIcon className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <p className="text-muted-foreground line-clamp-2">
                    {t.visualDirection.description}
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <MessageSquare className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <p className="text-foreground line-clamp-3 leading-relaxed">
                    {t.caption}
                  </p>
                </div>
                {t.hashtags?.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Hash className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <p className="text-primary/70 line-clamp-1">
                      {t.hashtags.slice(0, 6).join(" ")}
                    </p>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
