import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { CreatorLogo } from "@/components/CreatorLogo";
import { Eye, EyeOff, Mail, Lock, Sun, Moon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TeamSelectionDialog } from "@/components/auth/TeamSelectionDialog";
import ChangePasswordDialog from "@/components/perfil/ChangePasswordDialog";
import { useOAuthCallback } from "@/hooks/useOAuthCallback";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/hooks/useTranslation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import decorativeElement from "@/assets/decorative-element.png";
import backgroundVideo from "@/assets/background-video.mp4";

const Login = () => {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
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
    if (waitingForAuth && !authLoading && user && team && !showChangePassword && !showTeamSelection) {
      console.log('[Login] Auth complete, redirecting to dashboard');
      navigate("/dashboard", { replace: true });
    }
  }, [waitingForAuth, authLoading, user, team, showChangePassword, showTeamSelection, navigate]);
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
        // Verificar se o usuário precisa trocar a senha
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("team_id, force_password_change")
          .eq("id", data.user.id)
          .single();
          
        if (profileError) {
          console.error("Erro ao carregar perfil:", profileError);
          toast.error(t.errors.somethingWrong);
          return;
        }

        // Se precisa trocar senha, mostrar modal
        if (profileData.force_password_change) {
          setShowChangePassword(true);
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
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);
  const loginForm = useMemo(
    () => (
      <form onSubmit={handleLogin} className="space-y-6">
        <div className="space-y-2">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              placeholder={t.login.email}
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder={t.login.password}
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
        </div>

        {showPasswordResetSuggestion && (
          <div className="mb-4 p-4 bg-destructive/10 border-2 border-destructive/30 rounded-lg animate-fade-in">
            <div className="flex items-start gap-3">
              <Mail className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-destructive mb-1">{t.login.incorrectCredentials}</p>
                <p className="text-xs text-muted-foreground mb-2">
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
          className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-medium rounded-xl transition-all duration-300 transform hover:scale-[1.02] disabled:opacity-50"
        >
          {loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>{t.login.signingIn}</span>
            </div>
          ) : (
            t.login.signIn
          )}
        </Button>

        <div className="text-center mt-6">
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
    ],
  );
  return (
    <>
      <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/5">
        {/* Vídeo de fundo embaçado */}
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover opacity-40 pointer-events-none"
          style={{ filter: "blur(12px)" }}
        >
          <source src={backgroundVideo} type="video/mp4" />
        </video>

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
          
          {/* Partículas flutuantes */}
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-primary/30"
              style={{
                left: `${20 + i * 15}%`,
                top: `${10 + i * 10}%`,
              }}
              animate={{
                y: [0, -100, 0],
                opacity: [0.3, 0.8, 0.3],
              }}
              transition={{
                duration: 3 + i,
                repeat: Infinity,
                ease: "easeInOut",
                delay: i * 0.5,
              }}
            />
          ))}
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
          className="mb-8 z-10"
        >
          <CreatorLogo className="mb-4" />
        </motion.div>

        {/* Card de login centralizado */}
        {isMobile ? (
          <Sheet open={true}>
            <SheetContent 
              side="bottom" 
              className="h-[85vh] rounded-t-3xl border-t-2 border-primary/20 px-6 pt-6"
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
            <div className="bg-card/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-primary/10 p-8">
              <div className="mb-6 text-center">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-2">
                  {t.login.welcome}
                </h1>
                <p className="text-muted-foreground">
                  {t.login.welcomeMessage}
                </p>
              </div>
              {loginForm}
            </div>
          </motion.div>
        )}
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
