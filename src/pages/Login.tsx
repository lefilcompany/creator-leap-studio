import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { CreatorLogo } from "@/components/CreatorLogo";
import { Eye, EyeOff, Chrome, Facebook, Mail, Lock, Sun, Moon, Loader2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TeamSelectionDialog } from "@/components/auth/TeamSelectionDialog";
import { useOAuthCallback } from "@/hooks/useOAuthCallback";
import { useIsMobile } from "@/hooks/use-mobile";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showTeamSelection, setShowTeamSelection] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [facebookLoading, setFacebookLoading] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [showPasswordResetSuggestion, setShowPasswordResetSuggestion] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { theme, setTheme } = useTheme();
  
  const { showTeamDialog: oauthTeamDialog, handleTeamDialogClose: handleOAuthTeamDialogClose } = useOAuthCallback();
  
  useEffect(() => {
    const isNewUser = searchParams.get('newUser') === 'true';
    if (isNewUser) {
      toast.info('Complete seu cadastro configurando sua equipe após fazer login.');
    }
  }, [searchParams]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setFailedAttempts(failedAttempts + 1);
        setShowPasswordResetSuggestion(true);
        toast.error('Credenciais de login inválidas. Considere redefinir sua senha usando "Esqueci a senha".', {
          duration: 6000,
        });
        return;
      }

      // Login bem-sucedido, resetar contador
      setFailedAttempts(0);
      setShowPasswordResetSuggestion(false);

      if (data.user) {
        // Verificar se o usuário tem equipe
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('team_id')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          console.error('Erro ao carregar perfil:', profileError);
          toast.error('Erro ao verificar dados do usuário');
          return;
        }

        // Se não tem equipe, verificar se há solicitação pendente
        if (!profileData.team_id) {
          const { data: pendingRequest } = await supabase
            .from('team_join_requests')
            .select('id, status')
            .eq('user_id', data.user.id)
            .eq('status', 'pending')
            .maybeSingle();

          if (pendingRequest) {
            toast.info("Sua solicitação está pendente. Aguarde a aprovação do administrador da equipe.");
            await supabase.auth.signOut();
            return;
          }

          toast.success("Login realizado com sucesso!");
          setShowTeamSelection(true);
        } else {
          toast.success("Login realizado com sucesso!");
          navigate("/dashboard");
        }
      }
    } catch (error) {
      toast.error("Erro ao fazer login. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/login`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('Google OAuth error:', error);
        
        if (error.message.includes('provider is not enabled') || error.message.includes('Unsupported provider')) {
          toast.error('Login com Google não está configurado. Entre em contato com o administrador.', {
            duration: 5000,
          });
        } else {
          toast.error(error.message);
        }
        setGoogleLoading(false);
      }
    } catch (error) {
      console.error('Google login error:', error);
      toast.error("Erro ao fazer login com Google. Tente novamente mais tarde.");
      setGoogleLoading(false);
    }
  };

  const handleFacebookLogin = async () => {
    setFacebookLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: `${window.location.origin}/login`,
          scopes: 'email,public_profile',
        },
      });

      if (error) {
        console.error('Facebook OAuth error:', error);
        
        if (error.message.includes('provider is not enabled') || error.message.includes('Unsupported provider')) {
          toast.error('Login com Facebook não está configurado. Entre em contato com o administrador.', {
            duration: 5000,
          });
        } else {
          toast.error(error.message);
        }
        setFacebookLoading(false);
      }
    } catch (error) {
      console.error('Facebook login error:', error);
      toast.error("Erro ao fazer login com Facebook. Tente novamente mais tarde.");
      setFacebookLoading(false);
    }
  };

  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);

  const LoginForm = () => (
    <form onSubmit={handleLogin} className="space-y-6">
      <div className="space-y-2">
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="E-mail"
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
            placeholder="Senha"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="pl-10 pr-10 h-12"
          />
          <Button type="button" variant="ghost" size="icon" className="absolute top-1/2 -translate-y-1/2 right-1 h-10 w-10 text-muted-foreground hover:bg-accent/60" onClick={() => setShowPassword(!showPassword)}>
            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
          </Button>
        </div>
      </div>

      {showPasswordResetSuggestion && (
        <div className="mb-4 p-4 bg-destructive/10 border-2 border-destructive/30 rounded-lg animate-fade-in">
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-destructive mb-1">
                Credenciais incorretas
              </p>
              <p className="text-xs text-muted-foreground mb-2">
                Se você esqueceu sua senha ou está com dificuldades para entrar, 
                redefina sua senha usando a opção abaixo.
              </p>
              <a 
                href="/forgot-password" 
                className="text-sm text-destructive hover:text-destructive/80 font-semibold underline underline-offset-2"
              >
                Redefinir minha senha →
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
            Mantenha-me conectado
          </Label>
        </div>
        <a 
          href="/forgot-password" 
          className={`text-sm transition-all duration-300 ${
            showPasswordResetSuggestion 
              ? 'text-destructive hover:text-destructive/80 font-semibold animate-pulse' 
              : 'text-primary hover:text-primary/80'
          }`}
        >
          Esqueceu a senha?
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
            <span>Entrando...</span>
          </div>
        ) : (
          "Entrar"
        )}
      </Button>

      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/30"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-card px-4 text-muted-foreground">ou continue com</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <Button 
          variant="outline"
          onClick={handleGoogleLogin}
          type="button"
          disabled={googleLoading || loading}
          className="h-12 border-border/50 hover:bg-primary/5 hover:border-primary/30 hover:text-primary transition-all duration-200"
        >
          {googleLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Chrome className="w-5 h-5 mr-2" />
              Google
            </>
          )}
        </Button>
        <Button 
          variant="outline"
          type="button"
          onClick={handleFacebookLogin}
          disabled={facebookLoading || loading}
          className="h-12 border-border/50 hover:bg-secondary/5 hover:border-secondary/30 hover:text-secondary transition-all duration-200"
        >
          {facebookLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Facebook className="w-5 h-5 mr-2" />
              Facebook
            </>
          )}
        </Button>
      </div>

      <div className="text-center">
        <span className="text-muted-foreground text-sm">Não tem uma conta? </span>
        <a 
          href="/register" 
          className="text-primary hover:text-primary/80 font-medium text-sm transition-colors"
        >
          Criar conta
        </a>
      </div>
    </form>
  );

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
              IA para planejar e criar conteúdo estratégico
            </h1>
            <p className="text-lg text-muted-foreground leading-relaxed">
              Organize sua comunicação em torno de Equipes, Marcas, Temas e Personas
            </p>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-4 bg-card/30 backdrop-blur-sm rounded-xl border border-primary/20">
              <div className="w-3 h-3 bg-primary rounded-full"></div>
              <div>
                <h3 className="font-semibold text-foreground text-base">Organização Estratégica</h3>
                <p className="text-muted-foreground text-sm">Estruture sua comunicação de forma clara e integrada</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-4 bg-card/30 backdrop-blur-sm rounded-xl border border-secondary/20">
              <div className="w-3 h-3 bg-secondary rounded-full"></div>
              <div>
                <h3 className="font-semibold text-foreground text-base">Segmentação por Personas</h3>
                <p className="text-muted-foreground text-sm">Conteúdos personalizados para diferentes públicos</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4 p-4 bg-card/30 backdrop-blur-sm rounded-xl border border-accent/20">
              <div className="w-3 h-3 bg-accent rounded-full"></div>
              <div>
                <h3 className="font-semibold text-foreground text-base">Campanhas Completas</h3>
                <p className="text-muted-foreground text-sm">Calendários completos, não apenas posts isolados</p>
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
            
            <div className="relative z-10 text-center space-y-8 mb-32">
              <CreatorLogo className="mb-8" />
              
              <div className="space-y-4">
                <h1 className="text-4xl font-bold text-foreground">
                  Olá!
                </h1>
                <p className="text-xl text-muted-foreground max-w-sm mx-auto">
                  Bem-vindo ao Creator
                </p>
                <p className="text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
                  IA para planejar e criar conteúdo estratégico
                </p>
              </div>
            </div>

            {/* Fixed buttons at bottom */}
            <div className="absolute bottom-8 left-0 right-0 px-8 space-y-3">
              <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetTrigger asChild>
                  <Button 
                    className="w-full h-14 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold rounded-2xl text-lg shadow-xl"
                  >
                    Entrar
                  </Button>
                </SheetTrigger>
                <SheetContent 
                  side="bottom" 
                  className="h-[90vh] rounded-t-3xl p-0 border-t-2"
                >
                  <div className="h-full overflow-y-auto p-6 pt-8">
                    <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full mx-auto mb-8"></div>
                    
                    <div className="text-center mb-8">
                      <h2 className="text-2xl font-bold text-foreground mb-2">Acesse o Creator</h2>
                      <p className="text-muted-foreground">Sua plataforma de marketing estratégico</p>
                    </div>

                    <LoginForm />
                  </div>
                </SheetContent>
              </Sheet>

              <Button 
                variant="outline" 
                className="w-full h-14 bg-card/90 backdrop-blur-xl border-2 font-semibold rounded-2xl text-lg"
                onClick={() => navigate("/register")}
              >
                Criar conta
              </Button>
            </div>
          </div>
        </div>
      ) : (
        /* Desktop version - Right side - Login form */
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative">
          {/* Login card */}
          <div className="w-full max-w-md">
            <div className="bg-card/90 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-foreground mb-2">Acesse o Creator</h2>
                <p className="text-muted-foreground">Sua plataforma de marketing estratégico</p>
              </div>

              <LoginForm />
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
      />
    </div>
  );
};

export default Login;