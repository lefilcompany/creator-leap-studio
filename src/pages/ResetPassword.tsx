import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreatorLogo } from "@/components/CreatorLogo";
import { Lock, Eye, EyeOff, Sun, Moon, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [passwordReset, setPasswordReset] = useState(false);
  const [isValidRecovery, setIsValidRecovery] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    // Verificar se há uma sessão de recuperação válida
    const checkRecoverySession = async () => {
      setIsChecking(true);
      
      try {
        // Primeiro, verificar se há tokens na URL (hash)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const type = hashParams.get('type');
        
        // Se há tokens de recovery na URL, é um fluxo válido
        if (accessToken && type === 'recovery') {
          console.log("[ResetPassword] Recovery tokens found in URL");
          setIsValidRecovery(true);
          setIsChecking(false);
          return;
        }

        // Também verificar search params (alguns fluxos usam query params)
        const searchParams = new URLSearchParams(window.location.search);
        const tokenFromSearch = searchParams.get('token');
        const typeFromSearch = searchParams.get('type');
        
        if (tokenFromSearch && typeFromSearch === 'recovery') {
          console.log("[ResetPassword] Recovery tokens found in search params");
          setIsValidRecovery(true);
          setIsChecking(false);
          return;
        }

        // Verificar se já há uma sessão ativa com evento de recovery
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // Se há uma sessão, verificar se o usuário veio de um fluxo de recovery
          // Isso acontece quando o Supabase já processou o token
          console.log("[ResetPassword] Active session found, allowing password reset");
          setIsValidRecovery(true);
          setIsChecking(false);
          return;
        }

        // Nenhum token ou sessão válida encontrada
        console.log("[ResetPassword] No valid recovery session found");
        toast.error("Link de recuperação inválido ou expirado");
        navigate("/");
      } catch (error) {
        console.error("[ResetPassword] Error checking recovery session:", error);
        toast.error("Erro ao verificar link de recuperação");
        navigate("/");
      }
    };

    // Listener para eventos de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[ResetPassword] Auth event:", event);
      
      if (event === 'PASSWORD_RECOVERY') {
        console.log("[ResetPassword] PASSWORD_RECOVERY event received");
        setIsValidRecovery(true);
        setIsChecking(false);
      }
    });

    checkRecoverySession();

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const validatePassword = () => {
    if (password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return false;
    }
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return false;
    }
    return true;
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePassword()) {
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        console.error("[ResetPassword] Error updating password:", error);
        toast.error(error.message);
        return;
      }

      setPasswordReset(true);
      toast.success("Senha redefinida com sucesso!");
      
      // Fazer logout para forçar novo login com a nova senha
      await supabase.auth.signOut();
      
      // Redirecionar após 2 segundos
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (error) {
      console.error("[ResetPassword] Unexpected error:", error);
      toast.error("Erro ao redefinir senha. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = () => {
    if (password.length === 0) return null;
    if (password.length < 6) return { label: "Fraca", color: "text-destructive" };
    if (password.length < 10) return { label: "Média", color: "text-yellow-500" };
    return { label: "Forte", color: "text-green-500" };
  };

  const strength = getPasswordStrength();

  // Mostrar loading enquanto verifica
  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Verificando link de recuperação...</p>
        </div>
      </div>
    );
  }

  // Se não é um recovery válido, não mostrar nada (será redirecionado)
  if (!isValidRecovery) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 flex relative">
      {/* Theme toggle button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        className="absolute top-4 right-4 z-50 h-10 w-10 rounded-full"
      >
        <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
        <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
        <span className="sr-only">Alternar tema</span>
      </Button>
      
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-accent/10 via-secondary/15 to-primary/5"></div>
      <div className="absolute inset-0 bg-gradient-to-tl from-secondary/10 via-transparent to-accent/15 opacity-70"></div>
      
      {/* Center content */}
      <div className="w-full flex items-center justify-center p-8 relative">
        {/* Mobile header */}
        <div className="lg:hidden absolute top-8 left-8">
          <CreatorLogo />
        </div>

        {/* Reset password card */}
        <div className="w-full max-w-md">
          <div className="bg-card/90 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl p-8">
            {!passwordReset ? (
              <>
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-bold text-foreground mb-2">Redefinir Senha</h2>
                  <p className="text-muted-foreground">
                    Crie uma nova senha segura para sua conta
                  </p>
                </div>

                <form onSubmit={handleResetPassword} className="space-y-6">
                  <div className="space-y-2">
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Nova senha"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10 h-12"
                      />
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="absolute top-1/2 -translate-y-1/2 right-1 h-10 w-10 text-muted-foreground hover:bg-accent/60" 
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </Button>
                    </div>
                    {strength && (
                      <p className={`text-sm ${strength.color}`}>
                        Força da senha: {strength.label}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirmar senha"
                        required
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10 pr-10 h-12"
                      />
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="icon" 
                        className="absolute top-1/2 -translate-y-1/2 right-1 h-10 w-10 text-muted-foreground hover:bg-accent/60" 
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </Button>
                    </div>
                  </div>

                  <div className="bg-accent/10 border border-accent/20 rounded-lg p-4">
                    <p className="text-sm text-muted-foreground">
                      A senha deve ter pelo menos 6 caracteres
                    </p>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={loading}
                    className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-medium rounded-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Redefinindo...</span>
                      </div>
                    ) : (
                      "Redefinir Senha"
                    )}
                  </Button>
                </form>
              </>
            ) : (
              <div className="text-center space-y-6">
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-green-500" />
                </div>
                
                <div>
                  <h2 className="text-2xl font-bold text-foreground mb-2">Senha Redefinida!</h2>
                  <p className="text-muted-foreground">
                    Sua senha foi alterada com sucesso. Você será redirecionado para o login.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
