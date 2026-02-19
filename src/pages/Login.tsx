import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { CreatorLogo } from "@/components/CreatorLogo";
import { Eye, EyeOff, Mail, Lock, Sun, Moon, Loader2, Chrome } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { toast } from "sonner";
import { TeamSelectionDialog } from "@/components/auth/TeamSelectionDialog";
import ChangePasswordDialog from "@/components/perfil/ChangePasswordDialog";
import { useOAuthCallback } from "@/hooks/useOAuthCallback";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/hooks/useTranslation";
// NativeSelect used for dropdowns to avoid extension conflicts
import { useAuth } from "@/hooks/useAuth";
import { getOAuthRedirectUri, validateReturnUrl } from "@/lib/auth-urls";
import { motion } from "framer-motion";
import decorativeElement from "@/assets/decorative-element.png";

const Login = () => {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showTeamSelection, setShowTeamSelection] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [showPasswordResetSuggestion, setShowPasswordResetSuggestion] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [waitingForAuth, setWaitingForAuth] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { theme, setTheme } = useTheme();
  const { language } = useLanguage();
  const { user, team, isLoading: authLoading } = useAuth();
  const { showTeamDialog: oauthTeamDialog, handleTeamDialogClose: handleOAuthTeamDialogClose } = useOAuthCallback();
  

  // Redireciona automaticamente quando autenticado
  useEffect(() => {
    if (waitingForAuth && !authLoading && user && !showChangePassword && !showTeamSelection) {
      // Admin users go to /admin, regular users need team and go to dashboard
      if (user.isAdmin) {
        console.log('[Login] Admin user detected, redirecting to /admin');
        navigate('/admin', { replace: true });
      } else if (team) {
        const returnUrl = validateReturnUrl(searchParams.get('returnUrl'));
        console.log('[Login] Auth complete, redirecting to:', returnUrl);
        navigate(returnUrl, { replace: true });
      }
    }
  }, [waitingForAuth, authLoading, user, team, showChangePassword, showTeamSelection, navigate, searchParams]);
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setWaitingForAuth(false);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        setFailedAttempts(failedAttempts + 1);
        setShowPasswordResetSuggestion(true);
        toast.error(t.login.invalidCredentials, {
          duration: 6000,
        });
        return;
      }

      // Login bem-sucedido, resetar contador
      setFailedAttempts(0);
      setShowPasswordResetSuggestion(false);
      
      if (data.user) {
        // Verificar se o usuário precisa trocar a senha e se é admin
        const [profileResult, adminResult] = await Promise.all([
          supabase
            .from("profiles")
            .select("team_id, force_password_change")
            .eq("id", data.user.id)
            .single(),
          supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", data.user.id)
            .eq("role", "admin")
            .maybeSingle()
        ]);
          
        if (profileResult.error) {
          console.error("Erro ao carregar perfil:", profileResult.error);
          toast.error(t.errors.somethingWrong);
          return;
        }

        const profileData = profileResult.data;
        const isAdmin = !!adminResult.data;

        // Se precisa trocar senha, mostrar modal
        if (profileData.force_password_change) {
          setShowChangePassword(true);
          return;
        }

        // Admin users don't need a team - redirect directly to /admin
        if (isAdmin) {
          console.log('[Login] Admin user logged in, redirecting to /admin');
          navigate('/admin', { replace: true });
          return;
        }

        // Se não tem equipe, verificar se há solicitação pendente
        if (!profileData.team_id) {
          const { data: pendingRequest } = await supabase
            .from("team_join_requests")
            .select("id, status")
            .eq("user_id", data.user.id)
            .eq("status", "pending")
            .maybeSingle();
            
          if (pendingRequest) {
            toast.info("Sua solicitação está pendente. Aguarde a aprovação do administrador da equipe.");
            await supabase.auth.signOut();
            return;
          }
          
          setShowTeamSelection(true);
        } else {
          // Tem equipe - aguardar AuthContext carregar
          setWaitingForAuth(true);
        }
      }
    } catch (error) {
      console.error("Erro no login:", error);
      toast.error(t.errors.somethingWrong);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const redirectUri = getOAuthRedirectUri();
      console.log("[Login] OAuth redirect_uri:", redirectUri);
      const { error } = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: redirectUri,
        extraParams: {
          prompt: "select_account",
        },
      });
      if (error) {
        console.error("Google OAuth error:", error);
        if (String(error).includes("redirect_uri_mismatch")) {
          console.error("[Login] redirect_uri_mismatch - verifique as Authorized Redirect URIs no Google Cloud Console");
        }
        toast.error("Erro ao entrar com Google. Tente novamente.");
        setGoogleLoading(false);
      }
    } catch (error) {
      console.error("Google login error:", error);
      toast.error("Erro ao entrar com Google. Tente novamente.");
      setGoogleLoading(false);
    }
  };

  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);
  const loginForm = useMemo(
    () => (
      <form onSubmit={handleLogin} className="space-y-4">
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder={t.login.email}
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="pl-10 h-11"
          />
        </div>

        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="password"
            type={showPassword ? "text" : "password"}
            placeholder={t.login.password}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-10 pr-10 h-11"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-1/2 -translate-y-1/2 right-1 h-8 w-8 text-muted-foreground hover:bg-accent/60"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </Button>
        </div>

        {showPasswordResetSuggestion && (
          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg animate-fade-in">
            <div className="flex items-start gap-2">
              <Mail className="h-4 w-4 text-destructive mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-destructive mb-0.5">{t.login.incorrectCredentials}</p>
                <p className="text-xs text-muted-foreground mb-1.5">
                  {t.login.resetPasswordSuggestion}
                </p>
                <a
                  href="/forgot-password"
                  className="text-sm text-destructive hover:text-destructive/80 font-semibold underline underline-offset-2"
                >
                  {t.login.resetMyPassword}
                </a>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked as boolean)}
            />
            <Label htmlFor="remember" className="text-sm text-muted-foreground cursor-pointer">
              {t.login.rememberMe}
            </Label>
          </div>
          <a
            href="/forgot-password"
            className={`text-sm transition-all duration-300 ${showPasswordResetSuggestion ? "text-destructive hover:text-destructive/80 font-semibold animate-pulse" : "text-primary hover:text-primary/80"}`}
          >
            {t.login.forgotPassword}
          </a>
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-11 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-medium rounded-xl transition-all duration-300 hover:opacity-90 disabled:opacity-50"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>{t.login.signingIn}</span>
            </div>
          ) : (
            t.login.signIn
          )}
        </Button>

        <div className="relative my-2">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border/50" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card/80 px-2 text-muted-foreground">ou</span>
          </div>
        </div>

        <Button
          type="button"
          variant="outline"
          disabled={googleLoading}
          onClick={handleGoogleLogin}
          className="w-full h-11 rounded-xl font-medium transition-all duration-300"
        >
          {googleLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Chrome className="h-4 w-4 mr-2" />
          )}
          Entrar com Google
        </Button>

        <div className="text-center">
          <span className="text-muted-foreground text-sm">{t.login.noAccount} </span>
          <a href="/?mode=register" className="text-primary hover:text-primary/80 font-medium text-sm transition-colors">
            {t.login.createAccount}
          </a>
        </div>
      </form>
    ),
    [
      email,
      password,
      showPassword,
      rememberMe,
      loading,
      showPasswordResetSuggestion,
      handleLogin,
      googleLoading,
      handleGoogleLogin,
    ],
  );
  return (
    <>
      <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
        {/* Elementos decorativos animados com motion blur */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-20 -left-20 w-96 h-96 rounded-full bg-gradient-to-r from-primary/20 to-primary/5"
            style={{ filter: "blur(80px)" }}
            animate={{
              x: [0, 100, 0],
              y: [0, -50, 0],
              scale: [1, 1.2, 1],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute bottom-20 -right-20 w-[500px] h-[500px] rounded-full bg-gradient-to-l from-primary/15 to-accent/10"
            style={{ filter: "blur(100px)" }}
            animate={{
              x: [0, -80, 0],
              y: [0, 60, 0],
              scale: [1, 1.1, 1],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.div
            className="absolute top-1/2 left-1/4 w-64 h-64 rounded-full bg-primary/10"
            style={{ filter: "blur(60px)" }}
            animate={{
              x: [0, -50, 50, 0],
              y: [0, 50, -50, 0],
            }}
            transition={{
              duration: 15,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          
          {/* Imagens decorativas com motion blur */}
          <motion.img
            src={decorativeElement}
            alt=""
            className="absolute top-1/4 right-1/4 w-64 h-64 object-contain opacity-10"
            style={{ filter: "blur(8px)" }}
            animate={{
              x: [0, 60, -30, 0],
              y: [0, -40, 40, 0],
              rotate: [0, 15, -15, 0],
              scale: [1, 1.15, 0.95, 1],
            }}
            transition={{
              duration: 18,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
          <motion.img
            src={decorativeElement}
            alt=""
            className="absolute bottom-1/3 left-1/3 w-48 h-48 object-contain opacity-8"
            style={{ filter: "blur(10px)" }}
            animate={{
              x: [0, -50, 50, 0],
              y: [0, 60, -30, 0],
              rotate: [0, -20, 20, 0],
              scale: [1, 0.9, 1.1, 1],
            }}
            transition={{
              duration: 22,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1,
            }}
          />
          <motion.img
            src={decorativeElement}
            alt=""
            className="absolute top-1/3 left-1/5 w-40 h-40 object-contain opacity-6"
            style={{ filter: "blur(12px)" }}
            animate={{
              x: [0, 40, -40, 0],
              y: [0, -50, 50, 0],
              rotate: [0, 25, -25, 0],
              scale: [1, 1.2, 0.85, 1],
            }}
            transition={{
              duration: 20,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 2,
            }}
          />
          
        </div>

        {/* Botão de tema no canto superior direito */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-50"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? (
            <Sun className="h-5 w-5" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </Button>

        {/* Logo no topo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-5 z-10"
        >
          <CreatorLogo className="mb-4" />
        </motion.div>

        {/* Card de login centralizado */}
        {isMobile ? (
          <Sheet open={true}>
            <SheetContent 
              side="bottom" 
              className="h-[85vh] rounded-t-3xl border-t-2 border-primary/20 px-6 pt-6 overflow-x-hidden"
            >
              <div className="h-full overflow-y-auto pb-8">
                {loginForm}
              </div>
            </SheetContent>
          </Sheet>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="w-full max-w-md px-6 relative z-10"
          >
            <div className="bg-card/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-primary/10 p-6 overflow-x-hidden">
              <div className="mb-4 text-center">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-1">
                  {t.login.welcome}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {t.login.welcomeMessage}
                </p>
              </div>
              {loginForm}
            </div>
          </motion.div>
        )}

        {/* Links de Política de Privacidade e Contato */}
        <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground mt-4 z-10">
          <a href="/privacy" className="hover:text-primary transition-colors underline underline-offset-2">
            Política de Privacidade
          </a>
          <span>•</span>
          <a href="/contact" className="hover:text-primary transition-colors underline underline-offset-2">
            Contato
          </a>
        </div>
      </div>

      <TeamSelectionDialog 
        open={showTeamSelection} 
        onClose={() => {
          setShowTeamSelection(false);
          setWaitingForAuth(true);
        }}
      />

      <TeamSelectionDialog 
        open={oauthTeamDialog} 
        onClose={() => {
          handleOAuthTeamDialogClose();
          navigate("/dashboard", { replace: true });
        }}
      />

      <ChangePasswordDialog
        isOpen={showChangePassword}
        onOpenChange={(open) => {
          setShowChangePassword(open);
          if (!open) {
            setWaitingForAuth(true);
          }
        }}
      />
    </>
  );
};

export default Login;
