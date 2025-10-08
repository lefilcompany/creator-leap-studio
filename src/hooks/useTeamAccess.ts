import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useTeamAccess = () => {
  const { team } = useAuth();
  const [hasAccess, setHasAccess] = useState(true);
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);

  useEffect(() => {
    const checkAccess = async () => {
      if (!team?.id) {
        setHasAccess(false);
        setIsCheckingAccess(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc("check_team_access", {
          p_team_id: team.id,
        });

        if (error) {
          console.error("Erro ao verificar acesso da equipe:", error);
          setHasAccess(false);
        } else {
          setHasAccess(data || false);
        }
      } catch (error) {
        console.error("Erro ao verificar acesso:", error);
        setHasAccess(false);
      } finally {
        setIsCheckingAccess(false);
      }
    };

    checkAccess();
  }, [team?.id]);

  return {
    hasAccess,
    isCheckingAccess,
  };
};
