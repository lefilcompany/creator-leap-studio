import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface SystemRouteProps {
  children: React.ReactNode;
}

export const SystemRoute = ({ children }: SystemRouteProps) => {
  const { user, isLoading: authLoading } = useAuth();
  const [isSystemAdmin, setIsSystemAdmin] = useState<boolean | null>(null);
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
          toast.error("Erro ao verificar permissões");
        } else {
          setIsSystemAdmin(data || false);
          if (!data) {
            toast.error("Acesso negado. Você não tem permissões de administrador do sistema.");
          }
        }
      } catch (error) {
        console.error("Erro ao verificar system admin:", error);
        setIsSystemAdmin(false);
        toast.error("Erro ao verificar permissões");
      } finally {
        setIsChecking(false);
      }
    };

    checkSystemRole();
  }, [user?.id]);

  if (authLoading || isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || isSystemAdmin === false) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};