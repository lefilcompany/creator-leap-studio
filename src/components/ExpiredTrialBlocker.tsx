import { useEffect, useState } from "react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AlertCircle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

export const ExpiredTrialBlocker = () => {
  const navigate = useNavigate();
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const checkExpiredStatus = async () => {
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
        .select("subscription_status, plan_id")
        .eq("id", profile.team_id)
        .single();

      if (!team) return;

      // Bloquear se expirado e não for enterprise
      if (team.subscription_status === "expired" && team.plan_id !== "enterprise") {
        setIsExpired(true);
      }
    };

    checkExpiredStatus();
  }, []);

  if (!isExpired) return null;

  return (
    <AlertDialog open={isExpired}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <AlertDialogTitle className="text-xl">
              Créditos Insuficientes
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-base leading-relaxed">
            Seus créditos acabaram. Para continuar usando o Creator,
            você precisa comprar mais créditos.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            onClick={() => {
              window.open("https://wa.me/5581996600072", "_blank");
            }}
            variant="outline"
            className="w-full sm:w-auto"
          >
            Falar no WhatsApp
          </Button>
          <Button
            onClick={() => navigate("/plans")}
            className="w-full sm:w-auto"
          >
            Comprar Créditos
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
