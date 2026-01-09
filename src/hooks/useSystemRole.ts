import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export const useSystemRole = () => {
  const { user } = useAuth();
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const checkSystemRole = async () => {
      if (!user?.id) {
        setIsSystemAdmin(false);
        setIsChecking(false);
        return;
      }

      try {
        const { data, error } = await supabase.rpc("has_role", {
          _user_id: user.id,
          _role: "system",
        });

        if (error) {
          console.error("Erro ao verificar role de system:", error);
          setIsSystemAdmin(false);
        } else {
          setIsSystemAdmin(data || false);
        }
      } catch (error) {
        console.error("Erro ao verificar system admin:", error);
        setIsSystemAdmin(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkSystemRole();
  }, [user?.id]);

  return { isSystemAdmin, isChecking };
};