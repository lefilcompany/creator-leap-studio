import { useEffect, useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export const TrialBanner = () => {
  const navigate = useNavigate();
  const [trialInfo, setTrialInfo] = useState<{
    isTrialing: boolean;
    daysLeft: number;
    endDate: string | null;
  } | null>(null);

  useEffect(() => {
    const checkTrialStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("team_id")
        .eq("id", user.id)
        .single();

      if (!profile?.team_id) return;

      const { data: team } = await supabase
        .from("teams")
        .select("subscription_status, subscription_period_end, plan_id")
        .eq("id", profile.team_id)
        .single();

      if (!team) return;

      if (team.subscription_status === "trialing" && team.subscription_period_end) {
        const endDate = new Date(team.subscription_period_end);
        const now = new Date();
        const diffTime = endDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        setTrialInfo({
          isTrialing: true,
          daysLeft: diffDays,
          endDate: team.subscription_period_end,
        });
      }
    };

    checkTrialStatus();
  }, []);

  if (!trialInfo?.isTrialing) return null;

  return (
    <Card className="bg-gradient-to-r from-primary/10 to-accent/10 border-primary/20 p-4 mb-6">
      <div className="flex items-start gap-3">
        <Clock className="h-5 w-5 text-primary mt-0.5" />
        <div className="flex-1">
          <h3 className="font-semibold text-foreground mb-1">
            Período de Teste Ativo
          </h3>
          <p className="text-sm text-muted-foreground mb-3">
            Você tem <strong>{trialInfo.daysLeft} dias</strong> restantes no seu período de teste gratuito.
            {trialInfo.endDate && (
              <span className="block mt-1">
                Expira {formatDistanceToNow(new Date(trialInfo.endDate), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </span>
            )}
          </p>
          <Button
            onClick={() => navigate("/plans")}
            size="sm"
            variant="default"
          >
            Ver Planos
          </Button>
        </div>
      </div>
    </Card>
  );
};
