import { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CreatorLogo } from "@/components/CreatorLogo";
import { Eye, EyeOff, Mail, Lock, Sun, Moon, Loader2, User, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TeamSelectionDialog } from "@/components/auth/TeamSelectionDialog";
import { AuthModeToggle } from "@/components/auth/AuthModeToggle";
import ChangePasswordDialog from "@/components/perfil/ChangePasswordDialog";
import { useOAuthCallback } from "@/hooks/useOAuthCallback";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/hooks/useAuth";
import decorativeElement from "@/assets/decorative-element.png";

// Interfaces para os dados do IBGE
interface State {
  id: number;
  sigla: string;
  nome: string;
}

interface City {
  id: number;
  nome: string;
}

const Auth = () => {
  const { t } = useTranslation();
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showTeamSelection, setShowTeamSelection] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [waitingForAuth, setWaitingForAuth] = useState(false);
  
  // Login states
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [showPasswordResetSuggestion, setShowPasswordResetSuggestion] = useState(false);

  // Register states
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    state: "",
    city: "",
  });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loadingStates, setLoadingStates] = useState(true);
  const [loadingCities, setLoadingCities] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { theme, setTheme } = useTheme();
  const { language } = useLanguage();
  const { user, team, isLoading: authLoading } = useAuth();
  const { showTeamDialog: oauthTeamDialog, handleTeamDialogClose: handleOAuthTeamDialogClose } = useOAuthCallback();
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);

  // Validações de senha para registro
  const passwordsMatch = formData.password === confirmPassword;
  const isPasswordValid = formData.password && formData.password.length >= 6;

  // Redireciona automaticamente quando autenticado
  useEffect(() => {
    if (waitingForAuth && !authLoading && user && team && !showChangePassword && !showTeamSelection) {
      console.log('[Auth] Auth complete, redirecting to dashboard');
      navigate("/dashboard", { replace: true });
    }
  }, [waitingForAuth, authLoading, user, team, showChangePassword, showTeamSelection, navigate]);

  // Busca os estados do Brasil na API do IBGE
  useEffect(() => {
    fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome")
      .then((res) => res.json())
      .then((data: State[]) => {
        setStates(data);
        setLoadingStates(false);
      })
      .catch(() => {
        setLoadingStates(false);
        toast.error("Erro ao carregar estados");
      });
  }, []);

  // Busca as cidades sempre que um estado é selecionado
  useEffect(() => {
    if (formData.state) {
      setLoadingCities(true);
      setCities([]);
      fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${formData.state}/municipios`)
        .then((res) => res.json())
        .then((data: City[]) => {
          setCities(data);
          setLoadingCities(false);
        })
        .catch(() => {
          setLoadingCities(false);
          toast.error("Erro ao carregar cidades");
        });
    }
  }, [formData.state]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setWaitingForAuth(false);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });
      
      if (error) {
        setFailedAttempts(failedAttempts + 1);
        setShowPasswordResetSuggestion(true);
        toast.error(t.login.invalidCredentials, {
          duration: 6000,
        });
        return;
      }

      setFailedAttempts(0);
      setShowPasswordResetSuggestion(false);
      
      if (data.user) {
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

        if (profileData.force_password_change) {
          setShowChangePassword(true);
          return;
        }

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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    if (id === "phone") {
      const cleaned = value.replace(/\D/g, "");
      let formatted = cleaned;
      if (cleaned.length >= 1) {
        formatted = `(${cleaned.substring(0, 2)}`;
      }
      if (cleaned.length >= 3) {
        formatted += `) ${cleaned.substring(2, 7)}`;
      }
      if (cleaned.length >= 8) {
        formatted += `-${cleaned.substring(7, 11)}`;
      }
      setFormData((prev) => ({
        ...prev,
        [id]: formatted,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [id]: value,
      }));
    }
  };

  const handleSelectChange = (field: "state" | "city", value: string) => {
    const updatedData = {
      ...formData,
      [field]: value,
    };
    if (field === "state") {
      updatedData.city = "";
    }
    setFormData(updatedData);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!privacyChecked || !privacyAccepted) {
      toast.error("É necessário aceitar a Política de Privacidade para se cadastrar.");
      return;
    }
    if (formData.password !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    if (!formData.password || formData.password.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            phone: formData.phone,
            state: formData.state,
            city: formData.city,
          },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      if (data.user) {
        toast.success("Cadastro realizado com sucesso!");
        
        try {
          await supabase.functions.invoke('rd-station-integration', {
            body: {
              eventType: 'user_registered',
              userData: {
                email: formData.email,
                name: formData.name,
                phone: formData.phone,
                city: formData.city,
                state: formData.state,
                tags: ['novo_usuario', 'criador_conta']
              }
            }
          });
        } catch (rdError) {
          console.error('Erro ao enviar para RD Station:', rdError);
        }
        
        setShowTeamSelection(true);
      }
    } catch (err) {
      toast.error("Ocorreu um erro ao tentar se cadastrar.");
    } finally {
      setLoading(false);
    }
  };

  const loginForm = useMemo(
    () => (
      <form onSubmit={handleLogin} className="space-y-6">
        <div className="space-y-2">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              id="login-email"
              type="email"
              placeholder={t.login.email}
              required
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              className="pl-10 h-12"
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              id="login-password"
              type={showPassword ? "text" : "password"}
              placeholder={t.login.password}
              required
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
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
      </form>
    ),
    [loginEmail, loginPassword, showPassword, rememberMe, loading, showPasswordResetSuggestion, handleLogin, t]
  );

  const registerForm = useMemo(
    () => (
      <form onSubmit={handleRegister} className="space-y-2 sm:space-y-3 lg:space-y-4">
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="name"
            placeholder="Nome Completo"
            required
            value={formData.name}
            onChange={handleInputChange}
            className="pl-10 h-10 lg:h-11"
          />
        </div>

        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="E-mail"
            required
            value={formData.email}
            onChange={handleInputChange}
            className="pl-10 h-10 lg:h-11"
          />
        </div>

        <div className="flex flex-col sm:grid sm:grid-cols-2 gap-2 sm:gap-3 lg:gap-4">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Senha"
              required
              minLength={6}
              value={formData.password}
              onChange={handleInputChange}
              className="pl-10 pr-10 h-10 lg:h-11"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
            </Button>
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              placeholder="Confirmar Senha"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10 h-10 lg:h-11"
            />
          </div>
        </div>

        {formData.password && (
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 p-3 rounded-lg border border-green-200/50 dark:border-green-800/50 shadow-md">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <div className="flex items-center gap-2 text-sm">
                <div
                  className={`w-3 h-3 rounded-full flex items-center justify-center transition-all ${isPasswordValid ? "bg-green-500 shadow-sm" : "bg-red-500"}`}
                >
                  {isPasswordValid && <span className="text-white text-[10px]">✓</span>}
                </div>
                <span
                  className={`font-medium transition-colors ${isPasswordValid ? "text-green-700 dark:text-green-400" : "text-red-500"}`}
                >
                  Mínimo 6 caracteres
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div
                  className={`w-3 h-3 rounded-full flex items-center justify-center transition-all ${passwordsMatch && confirmPassword ? "bg-green-500 shadow-sm" : "bg-red-500"}`}
                >
                  {passwordsMatch && confirmPassword && <span className="text-white text-[10px]">✓</span>}
                </div>
                <span
                  className={`font-medium transition-colors ${passwordsMatch && confirmPassword ? "text-green-700 dark:text-green-400" : "text-red-500"}`}
                >
                  Senhas coincidem
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="phone"
            type="tel"
            placeholder="(XX) XXXXX-XXXX"
            value={formData.phone}
            onChange={handleInputChange}
            className="pl-10 h-10 lg:h-11"
            maxLength={15}
          />
        </div>

        <div className="flex flex-col sm:grid sm:grid-cols-2 gap-2 sm:gap-3 lg:gap-4">
          <div className="space-y-1">
            <Label htmlFor="state" className="text-muted-foreground text-xs">
              Estado
            </Label>
            <Select
              value={formData.state}
              onValueChange={(value) => handleSelectChange("state", value)}
              disabled={loadingStates}
            >
              <SelectTrigger className="h-10 lg:h-11 disabled:opacity-50 disabled:cursor-wait">
                <SelectValue placeholder={loadingStates ? "Carregando estados..." : "Selecione o estado"} />
              </SelectTrigger>
              <SelectContent className="bg-background border border-border shadow-lg max-h-[200px]">
                {states.map((state) => (
                  <SelectItem
                    key={state.id}
                    value={state.sigla}
                    className="hover:bg-accent hover:text-accent-foreground cursor-pointer"
                  >
                    {state.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="city" className="text-muted-foreground text-xs">
              Cidade
            </Label>
            <Select
              value={formData.city}
              onValueChange={(value) => handleSelectChange("city", value)}
              disabled={!formData.state || loadingCities}
            >
              <SelectTrigger className="h-10 lg:h-11 disabled:opacity-50 disabled:cursor-wait">
                <SelectValue
                  placeholder={
                    !formData.state
                      ? "Primeiro selecione o estado"
                      : loadingCities
                        ? "Carregando cidades..."
                        : "Selecione a cidade"
                  }
                />
              </SelectTrigger>
              <SelectContent className="bg-background border border-border shadow-lg max-h-[200px]">
                {cities.map((city) => (
                  <SelectItem
                    key={city.id}
                    value={city.nome}
                    className="hover:bg-accent hover:text-accent-foreground cursor-pointer"
                  >
                    {city.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-start gap-2 mt-2">
          <Checkbox
            id="privacy"
            checked={privacyChecked}
            onCheckedChange={(checked) => {
              if (checked) {
                setPrivacyModalOpen(true);
              } else {
                setPrivacyChecked(false);
                setPrivacyAccepted(false);
              }
            }}
            className="mt-1"
          />
          <Label htmlFor="privacy" className="text-xs text-muted-foreground select-none cursor-pointer leading-relaxed">
            Li e concordo com a{" "}
            <button
              type="button"
              className="underline text-primary hover:text-secondary transition-colors"
              onClick={() => setPrivacyModalOpen(true)}
            >
              Política de Privacidade
            </button>
          </Label>
        </div>

        <Button
          type="submit"
          className="w-full h-10 lg:h-11 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-medium rounded-xl transition-all duration-300 transform hover:scale-[1.02]"
          disabled={
            loading ||
            !formData.name ||
            !formData.email ||
            !formData.password ||
            !confirmPassword ||
            !privacyChecked ||
            !privacyAccepted
          }
        >
          {loading ? <Loader2 className="animate-spin h-4 w-4" /> : "CRIAR CONTA"}
        </Button>
      </form>
    ),
    [formData, confirmPassword, showPassword, loading, privacyChecked, privacyAccepted, states, cities, loadingStates, loadingCities, passwordsMatch, isPasswordValid, handleRegister, handleInputChange, handleSelectChange]
  );

  return (
    <>
      <div className="h-screen flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/5 p-4 sm:p-6">
        {/* Elementos decorativos animados com motion blur */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            className="absolute top-20 -left-20 w-96 h-96 rounded-full bg-gradient-to-r from-primary/20 to-primary/5"
            style={{ filter: "blur(60px) sm:blur(80px)" }}
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
            style={{ filter: "blur(80px) sm:blur(100px)" }}
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
            className="absolute top-1/4 right-[5%] w-64 h-64 object-contain opacity-10"
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
          className="mb-3 sm:mb-4 z-10 flex-shrink-0"
        >
          <CreatorLogo />
        </motion.div>

        {/* Card de auth centralizado - Responsivo para todos os dispositivos */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-[90%] sm:max-w-md relative z-10 flex-1 flex flex-col min-h-0"
        >
          <div className="bg-card/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-primary/10 p-3 sm:p-5 md:p-8 overflow-hidden flex flex-col h-full">
            {/* Toggle de modo */}
            <div className="flex items-center justify-center mb-4 sm:mb-6 md:mb-8 flex-shrink-0">
              <AuthModeToggle
                isLoginMode={isLoginMode}
                onToggle={setIsLoginMode}
              />
            </div>

            <div className="text-center mb-2 sm:mb-3 md:mb-4 flex-shrink-0">
              <AnimatePresence mode="wait">
                <motion.h2 
                  key={isLoginMode ? "login-title" : "register-title"}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.2 }}
                  className="text-xl sm:text-2xl md:text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-2"
                >
                  {isLoginMode ? t.login.welcome : "Crie sua conta"}
                </motion.h2>
              </AnimatePresence>
              <p className="text-sm sm:text-base text-muted-foreground">
                {isLoginMode ? t.login.welcomeMessage : "Comece a criar conteúdo estratégico hoje"}
              </p>
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden min-h-0 -mx-1 px-1 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={isLoginMode ? "login" : "register"}
                initial={{ 
                  opacity: 0, 
                  y: 15,
                  filter: "blur(4px)",
                  scale: 0.96
                }}
                animate={{ 
                  opacity: 1, 
                  y: 0,
                  filter: "blur(0px)",
                  scale: 1
                }}
                exit={{ 
                  opacity: 0, 
                  y: -15,
                  filter: "blur(4px)",
                  scale: 0.96,
                  transition: { duration: 0.2, ease: [0.4, 0, 0.6, 1] }
                }}
                transition={{ 
                  duration: 0.4, 
                  ease: [0.16, 1, 0.3, 1],
                  filter: { duration: 0.3 }
                }}
              >
                {isLoginMode ? loginForm : registerForm}
              </motion.div>
            </AnimatePresence>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Modal de Política de Privacidade - Melhorado para Mobile/Tablet */}
      <Dialog open={privacyModalOpen} onOpenChange={setPrivacyModalOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg w-full max-h-[90vh] p-0 flex flex-col">
          {/* Header Fixo */}
          <DialogHeader className="flex-shrink-0 sticky top-0 z-20 bg-background border-b p-4 sm:p-6 pb-3 sm:pb-4">
            <DialogTitle className="text-base sm:text-lg font-bold leading-tight pr-8 text-foreground">
              Política de Privacidade – Uso de Dados e IA
            </DialogTitle>
          </DialogHeader>

          {/* Conteúdo Scrollável */}
          <div className="flex-1 overflow-y-auto px-4 py-3 sm:px-6 sm:py-4 max-h-[calc(90vh-180px)]">
            <div className="space-y-3 sm:space-y-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground text-sm leading-relaxed">
                👋 Olá! Antes de usar nossa plataforma, é importante que você saiba como cuidamos dos seus dados:
              </p>
              <ul className="list-disc pl-4 sm:pl-5 space-y-2.5 sm:space-y-3">
                <li className="leading-relaxed text-sm">
                  <span className="font-semibold text-foreground">O que coletamos:</span> informações de cadastro
                  (nome, e-mail, telefone), dados de navegação, histórico de uso e, quando necessário, informações de
                  pagamento.
                </li>
                <li className="leading-relaxed text-sm">
                  <span className="font-semibold text-foreground">Como usamos:</span> para oferecer e melhorar os
                  serviços, personalizar sua experiência, enviar novidades e cumprir obrigações legais.
                </li>
                <li className="leading-relaxed text-sm">
                  <span className="font-semibold text-foreground">Inteligência Artificial:</span> usamos IA para
                  recomendar conteúdos, apoiar no suporte e ajudar na criação de materiais. Mas sempre com
                  transparência e sem usar dados sensíveis sem sua permissão.
                </li>
                <li className="leading-relaxed text-sm">
                  <span className="font-semibold text-foreground">Compartilhamento:</span> nunca vendemos seus dados.
                  Só compartilhamos com parceiros essenciais para o funcionamento da plataforma ou quando a lei
                  exigir.
                </li>
                <li className="leading-relaxed text-sm">
                  <span className="font-semibold text-foreground">Seus direitos:</span> você pode pedir acesso,
                  correção, exclusão ou portabilidade dos seus dados, além de cancelar comunicações de marketing a
                  qualquer momento.
                </li>
                <li className="leading-relaxed text-sm">
                  <span className="font-semibold text-foreground">Segurança:</span> seus dados ficam protegidos com
                  medidas avançadas de segurança e só são armazenados pelo tempo necessário.
                </li>
              </ul>
              <div className="pt-2 sm:pt-3">
                <p className="font-medium text-foreground text-sm leading-relaxed">
                  🤝 Ao aceitar, você concorda com esses termos e pode usar nossa plataforma com segurança e
                  tranquilidade.
                </p>
              </div>
            </div>
          </div>

          {/* Footer Fixo com Botões Sempre Visíveis */}
          <DialogFooter className="flex-shrink-0 sticky bottom-0 z-20 bg-background border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] p-4 sm:p-6 pt-3 sm:pt-4">
            <div className="flex flex-col-reverse sm:flex-row gap-3 w-full">
              <Button
                variant="outline"
                onClick={() => {
                  setPrivacyModalOpen(false);
                  setPrivacyChecked(false);
                }}
                className="flex-1 h-12 text-sm font-medium"
              >
                Recusar
              </Button>
              <Button
                onClick={() => {
                  setPrivacyAccepted(true);
                  setPrivacyModalOpen(false);
                }}
                className="flex-1 h-12 text-sm font-medium"
              >
                Aceitar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

export default Auth;
