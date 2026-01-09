import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireTeam?: boolean;
}

export default function ProtectedRoute({ children, requireTeam = true }: ProtectedRouteProps) {
  const { user, session, team, isLoading, isTrialExpired, trialDaysRemaining } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const hasRedirected = useRef(false);

  useEffect(() => {
    if (isLoading) return;
    
    if (hasRedirected.current) return;

    // Verificar se realmente não há sessão ativa antes de redirecionar
    if (!session || !user) {
      console.log("[ProtectedRoute] No session or user found after loading completed");
      
      // Double check: verificar localStorage antes de redirecionar
      const hasStoredSession = localStorage.getItem('sb-afxwqkrneraatgovhpkb-auth-token');
      
      if (hasStoredSession) {
        console.log("[ProtectedRoute] Found stored session, waiting for auth to complete...");
        return; // Aguardar auth context processar
      }
      
      console.log("[ProtectedRoute] No stored session, redirecting to login");
      hasRedirected.current = true;
      navigate("/", { replace: true });
      return;
    }

    // Se o usuário é system admin, redirecionar para a área do sistema
    if (user?.isAdmin) {
      console.log("[ProtectedRoute] System admin user detected, redirecting to system area");
      hasRedirected.current = true;
      navigate("/system", { replace: true });
      return;
    }

    // Se requer equipe e o usuário não tem equipe, mostra mensagem
    if (requireTeam && !team) {
      toast.error('Você precisa estar em uma equipe para ver esta página');
      return;
    }

    // Se o período de teste expirou, permite apenas histórico, planos e perfil
    if (requireTeam && team && isTrialExpired) {
      const currentPath = window.location.pathname;
      const allowedPaths = ['/plans', '/history', '/profile'];
      const isAllowedPath = allowedPaths.some(path => currentPath.startsWith(path));
      
      if (!isAllowedPath) {
        toast.error('Seu período de teste expirou. Escolha um plano para continuar.');
        navigate('/plans?expired=true');
        return;
      }
    }
  }, [user, team, session, isLoading, isTrialExpired, navigate, requireTeam]);

  // Mostra loading enquanto verifica autenticação
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  // Se não há usuário, não renderiza nada (vai redirecionar)
  if (!user) {
    return null;
  }

  // Se é system admin, não renderiza nada (vai redirecionar para system)
  if (user?.isAdmin) {
    return null;
  }

  // Se requer equipe e não tem, mostra mensagem
  if (requireTeam && !team) {
    return (
      <div className="flex h-screen w-full items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <div className="bg-destructive/10 rounded-full p-4 w-16 h-16 mx-auto flex items-center justify-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-8 w-8 text-destructive"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-foreground">Equipe necessária</h2>
          <p className="text-muted-foreground">
            Você precisa estar em uma equipe para ver esta página.
          </p>
          <p className="text-sm text-muted-foreground">
            Crie uma equipe ou solicite para entrar em uma equipe existente.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
