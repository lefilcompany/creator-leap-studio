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
  
  useEffect(() => {
    const isNewUser = searchParams.get("newUser") === "true";
    if (isNewUser) {
      toast.info(t.login.welcomeMessage);
    }
  }, [searchParams, t]);

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
          
          toast.success(t.login.welcomeMessage);
          setShowTeamSelection(true);
        } else {
          // Tem equipe - aguardar AuthContext carregar
          toast.success(t.login.welcomeMessage);
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
          <a href="/register" className="text-primary hover:text-primary/80 font-medium text-sm transition-colors">
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
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 flex relative">
      {/* Theme toggle */}
      <div className="absolute top-4 right-4 z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="h-10 w-10 rounded-full"
        >
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">{t.theme.toggle}</span>
        </Button>
      </div>

      {/* Background gradient for entire screen */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-accent/10 via-secondary/15 to-primary/5"></div>
      <div className="absolute inset-0 bg-gradient-to-tl from-secondary/10 via-transparent to-accent/15 opacity-70"></div>

      {/* Left side - Marketing content */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-16 py-8 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-1/4 left-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-1/4 right-10 w-64 h-64 bg-secondary/10 rounded-full blur-3xl"></div>

        <div className="relative max-w-lg">
          <div className="mb-6">
            <CreatorLogo className="mb-6" />
          </div>

          <div className="mb-8">
            <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-4 leading-tight">
              {t.login.strategicContent}
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              {t.login.strategicContentDesc}
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-card/30 backdrop-blur-sm rounded-xl border border-primary/20">
              <div className="w-3 h-3 bg-primary rounded-full"></div>
              <div>
                <h3 className="font-semibold text-foreground text-base">{t.login.strategicOrganization}</h3>
                <p className="text-muted-foreground text-sm">{t.login.strategicOrganizationDesc}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-card/30 backdrop-blur-sm rounded-xl border border-secondary/20">
              <div className="w-3 h-3 bg-secondary rounded-full"></div>
              <div>
                <h3 className="font-semibold text-foreground text-base">{t.login.personaSegmentation}</h3>
                <p className="text-muted-foreground text-sm">{t.login.personaSegmentationDesc}</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-card/30 backdrop-blur-sm rounded-xl border border-accent/20">
              <div className="w-3 h-3 bg-accent rounded-full"></div>
              <div>
                <h3 className="font-semibold text-foreground text-base">{t.login.completeCampaigns}</h3>
                <p className="text-muted-foreground text-sm">{t.login.completeCampaignsDesc}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile/Tablet version with Sheet */}
      {isMobile ? (
        <div className="w-full flex flex-col relative min-h-screen">
          {/* Hero section */}
          <div className="flex-1 flex flex-col items-center justify-center p-8 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-secondary/10 to-accent/20"></div>

            <div className="relative z-10 mb-32 w-full">
              <div className="flex flex-col items-start gap-8">
                <CreatorLogo className="flex-shrink-0" />

                <div className="text-left space-y-4">
                  <h1 className="text-2xl font-bold text-foreground leading-tight text-left md:text-4xl">
                    {t.login.strategicContent}
                  </h1>
                  <p className="text-base text-muted-foreground leading-relaxed text-left md:text-lg">
                    {t.login.strategicContentDesc}
                  </p>
                </div>
              </div>
            </div>

            {/* Fixed buttons at bottom */}
            <div className="absolute bottom-8 left-0 right-0 px-8 space-y-3">
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <Button className="w-full h-14 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold rounded-2xl text-lg shadow-xl">
                    {t.login.signIn}
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[90vh] rounded-t-3xl p-0 border-t-2">
                  <div className="h-full overflow-y-auto p-6 pt-8">
                    <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full mx-auto mb-8"></div>

                    <div className="text-center mb-8">
                      <h2 className="text-2xl font-bold text-foreground mb-2">Bem-vindo de volta! </h2>
                      <p className="text-muted-foreground">Acesse sua plataforma de conteúdo estratégico</p>
                    </div>

                    {loginForm}
                  </div>
                </SheetContent>
              </Sheet>

              <Button
                variant="outline"
                onClick={() => navigate("/register")}
                className="w-full h-14 bg-card/90 backdrop-blur-xl  font-semibold rounded-2xl text-lg hover:text-primary "
              >
                {t.login.createAccount}
              </Button>
            </div>
          </div>
        </div> /* Desktop version - Right side - Login form */
      ) : (
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative">
          {/* Login card */}
          <div className="w-full max-w-md">
            <div className="bg-card/90 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-2">{t.login.title}</h2>
                <p className="text-muted-foreground">{t.login.welcomeMessage}</p>
              </div>

              {loginForm}
            </div>
          </div>
        </div>
      )}

      {/* Team Selection Dialog */}
      <TeamSelectionDialog
        open={showTeamSelection || oauthTeamDialog}
        onClose={() => {
          setShowTeamSelection(false);
          if (oauthTeamDialog) {
            handleOAuthTeamDialogClose();
          }
        }}
        context="login"
      />

      {/* Change Password Dialog for specific user */}
      <ChangePasswordDialog
        isOpen={showChangePassword}
        onOpenChange={(open) => {
          setShowChangePassword(open);
          if (!open) {
            navigate("/dashboard");
          }
        }}
      />
    </div>
  );
};
export default Login;
