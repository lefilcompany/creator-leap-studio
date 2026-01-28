import { useAuth } from "@/hooks/useAuth";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Zap } from "lucide-react";

export const TrialBanner = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // Show banner only when credits are low (less than 10)
  if (!user || (user.credits || 0) >= 10) return null;

  const credits = user.credits || 0;
  const isZero = credits === 0;

  return (
    <Card className={`${isZero ? 'bg-gradient-to-r from-destructive/10 to-destructive/5 border-destructive/20' : 'bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20'} p-4 mb-6`}>
      <div className="flex items-start gap-3">
        {isZero ? (
          <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
        ) : (
          <Zap className="h-5 w-5 text-primary mt-0.5" />
        )}
        <div className="flex-1">
          <h3 className="font-semibold text-foreground mb-1">
            {isZero ? 'Créditos Esgotados' : 'Créditos Baixos'}
          </h3>
          <p className="text-sm text-muted-foreground mb-3">
            {isZero 
              ? 'Você não tem mais créditos disponíveis. Compre mais para continuar criando conteúdo.'
              : `Você tem apenas ${credits} créditos restantes. Compre mais para não ficar sem.`
            }
          </p>
          <Button
            onClick={() => navigate("/plans")}
            size="sm"
            variant={isZero ? "destructive" : "default"}
          >
            Comprar Créditos
          </Button>
        </div>
      </div>
    </Card>
  );
};
