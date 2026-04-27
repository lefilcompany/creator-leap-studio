import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Coins, Image as ImageIcon, MessageSquare, Hash, Sparkles, AlertCircle } from "lucide-react";
import { ContentTemplate, BriefingFormData } from "./types";
import { CREDIT_COSTS, formatCredits } from "@/lib/creditCosts";

interface Step4GenerateProps {
  template: ContentTemplate;
  briefing: BriefingFormData;
  userCredits: number;
}

export function Step4Generate({ template, briefing, userCredits }: Step4GenerateProps) {
  const cost = CREDIT_COSTS.CONTENT_BRIEFING_PACKAGE;
  const insufficient = userCredits < cost;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg sm:text-xl font-bold">Pronto para gerar</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Revise o resumo abaixo. Ao confirmar, a IA vai gerar a imagem e finalizar a legenda.
        </p>
      </div>

      <Card className="border-2 border-primary/20 bg-card rounded-2xl overflow-hidden">
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
                {template.format}
              </Badge>
              <Badge variant="outline">{template.visualDirection.aspectRatio}</Badge>
              <Badge variant="outline" className="capitalize">{briefing.platform}</Badge>
              <Badge variant="outline">{briefing.contentType === "ads" ? "Ads" : "Orgânico"}</Badge>
            </div>
          </div>

          <h3 className="font-bold text-lg text-foreground">{template.title}</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <ImageIcon className="h-3.5 w-3.5" />
                Direção visual
              </div>
              <p className="text-muted-foreground leading-relaxed line-clamp-5">
                {template.visualDirection.description}
              </p>
              <p className="text-xs text-muted-foreground/70">
                {template.visualDirection.visualStyle} • {template.visualDirection.mood} • {template.visualDirection.lighting}
              </p>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                <MessageSquare className="h-3.5 w-3.5" />
                Legenda
              </div>
              <p className="text-foreground leading-relaxed line-clamp-6 whitespace-pre-wrap">
                {template.caption}
              </p>
              {template.hashtags.length > 0 && (
                <p className="text-xs text-primary/70 line-clamp-1 flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  {template.hashtags.join(" ")}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className={insufficient ? "border-destructive/40 bg-destructive/5" : "border-primary/30 bg-primary/5"}>
        <CardContent className="p-4 flex items-center gap-3">
          {insufficient ? (
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
          ) : (
            <Coins className="h-5 w-5 text-primary flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">
              {insufficient ? "Créditos insuficientes" : `Custo: ${formatCredits(cost)}`}
            </p>
            <p className="text-xs text-muted-foreground">
              {insufficient
                ? `Você tem ${formatCredits(userCredits)}. Compre mais para gerar este conteúdo.`
                : `Pacote completo: briefing + plano + 1 imagem + legenda. Você tem ${formatCredits(userCredits)}.`}
            </p>
          </div>
          <Sparkles className="h-5 w-5 text-primary flex-shrink-0 hidden sm:block" />
        </CardContent>
      </Card>
    </div>
  );
}
