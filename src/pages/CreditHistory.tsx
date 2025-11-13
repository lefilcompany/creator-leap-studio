import { useAuth } from "@/hooks/useAuth";
import { useCreditHistory } from "@/hooks/useCreditHistory";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Coins, TrendingDown, User, Calendar, ArrowLeft } from "lucide-react";
import { getCreditCostLabel } from "@/lib/creditCosts";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function CreditHistory() {
  const { team } = useAuth();
  const { data: history, isLoading } = useCreditHistory(team?.id);
  const navigate = useNavigate();

  const getActionLabel = (actionType: string): string => {
    const labels: Record<string, string> = {
      QUICK_IMAGE: "Imagem Rápida",
      COMPLETE_IMAGE: "Imagem Completa",
      IMAGE_GENERATION: "Geração de Imagem",
      IMAGE_REVIEW: "Revisão de Imagem",
      CAPTION_REVIEW: "Revisão de Legenda",
      TEXT_REVIEW: "Revisão de Texto",
      CONTENT_PLAN: "Planejamento de Conteúdo",
      VIDEO_GENERATION: "Geração de Vídeo",
      CREATE_BRAND: "Criar Marca",
      CREATE_PERSONA: "Criar Persona",
      CREATE_THEME: "Criar Tema",
      COUPON_REDEEM: "Cupom Resgatado",
      PLAN_UPGRADE: "Upgrade de Plano",
    };
    return labels[actionType] || actionType;
  };

  const getActionColor = (actionType: string): string => {
    if (actionType.includes("COUPON") || actionType.includes("UPGRADE")) {
      return "bg-green-500/10 text-green-600 border-green-500/30";
    }
    return "bg-orange-500/10 text-orange-600 border-orange-500/30";
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-6">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        <h1 className="text-3xl font-bold">Histórico de Créditos</h1>
        <p className="text-muted-foreground mt-2">
          Veja todas as ações e transações de créditos da sua equipe
        </p>
      </div>

      {!history || history.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Coins className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              Nenhuma transação de créditos registrada ainda.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {history.map((item) => (
            <Card key={item.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {getActionLabel(item.action_type)}
                      <Badge
                        variant="outline"
                        className={getActionColor(item.action_type)}
                      >
                        {item.credits_used > 0 ? "-" : "+"}
                        {Math.abs(item.credits_used)} crédito
                        {Math.abs(item.credits_used) !== 1 ? "s" : ""}
                      </Badge>
                    </CardTitle>
                    {item.description && (
                      <CardDescription>{item.description}</CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    {formatDistanceToNow(new Date(item.created_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {item.profiles?.name || "Usuário"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {item.credits_before} → {item.credits_after} créditos
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
