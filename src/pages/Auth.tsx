import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTheme } from "next-themes";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { CreatorLogo } from "@/components/CreatorLogo";
import { Eye, EyeOff, Mail, Lock, Sun, Moon, Loader2, User, Phone, ChevronDown, Ticket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TeamSelectionDialog } from "@/components/auth/TeamSelectionDialog";
import ChangePasswordDialog from "@/components/perfil/ChangePasswordDialog";
import { useOAuthCallback } from "@/hooks/useOAuthCallback";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/hooks/useAuth";
import { useExtensionProtection, useFormProtection } from "@/hooks/useExtensionProtection";
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
  
  // Proteção contra extensões do navegador
  useExtensionProtection();
  const loginFormRef = useRef<HTMLFormElement>(null);
  const registerFormRef = useRef<HTMLFormElement>(null);
  useFormProtection(loginFormRef);
  useFormProtection(registerFormRef);
  
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
  
  // Coupon states
  const [couponCode, setCouponCode] = useState("");
  const [isValidCouponFormat, setIsValidCouponFormat] = useState(false);

  // Detectar se é cupom promocional (formato: nome200)
  const isPromoCoupon = (code: string): boolean => {
    return /^[a-z]+200$/i.test(code.replace(/\s/g, ''));
  };

  // Detectar se é cupom checksum (formato: XX-YYYYYY-CC)
  const isChecksumFormat = (code: string): boolean => {
    return /^(B4|P7|C2|C1|C4)-[A-Z0-9]{6}-[A-Z0-9]{2}$/.test(code);
  };

  const handleCouponInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    // Se parece com cupom promocional (contém letras minúsculas ou termina com 200)
    if (/[a-z]/.test(value) || value.toLowerCase().endsWith('200')) {
      // Manter como está, apenas remover espaços
      value = value.replace(/\s/g, '').toLowerCase();
      setCouponCode(value);
      setIsValidCouponFormat(isPromoCoupon(value));
    } else {
      // Formato checksum - aplicar formatação automática
      value = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
      
      // Limitar a exatamente 10 caracteres (sem hífens)
      value = value.slice(0, 10);
      
      // Adicionar hífens automaticamente
      let formatted = value;
      if (value.length > 2) {
        formatted = value.slice(0, 2) + '-' + value.slice(2);
      }
      if (value.length > 8) {
        formatted = value.slice(0, 2) + '-' + value.slice(2, 8) + '-' + value.slice(8);
      }
      
      setCouponCode(formatted);
      setIsValidCouponFormat(isChecksumFormat(formatted));
    }
  };

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
    if (waitingForAuth && !authLoading && user && !showChangePassword) {
      if (user.isAdmin) {
        console.log("[Auth] Admin authenticated, redirecting to /admin");
        navigate("/admin", { replace: true });
        return;
      }

      // Usuário autenticado - redirecionar direto ao dashboard (sem exigir equipe)
      console.log("[Auth] Auth complete, redirecting to dashboard");
      navigate("/dashboard", { replace: true });
    }
  }, [waitingForAuth, authLoading, user, showChangePassword, navigate]);

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
            .maybeSingle(),
        ]);

        if (profileResult.error) {
          console.error("Erro ao carregar perfil:", profileResult.error);
          toast.error(t.errors.somethingWrong);
          return;
        }

        const profileData = profileResult.data;
        const isAdmin = !!adminResult.data;

        if (profileData.force_password_change) {
          setShowChangePassword(true);
          return;
        }

        // Admin não precisa de equipe nem seleção
        if (isAdmin) {
          navigate("/admin", { replace: true });
          return;
        }

        // Usuário autenticado - redirecionar direto (sem exigir equipe)
        setWaitingForAuth(true);
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

    // Validar campos obrigatórios
    if (
      !formData.name ||
      !formData.email ||
      !formData.password ||
      !formData.phone ||
      !formData.state ||
      !formData.city
    ) {
      toast.error("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    if (!privacyChecked || !privacyAccepted) {
      toast.error("É necessário aceitar a Política de Privacidade para se cadastrar.");
      return;
    }

    if (!passwordsMatch) {
      toast.error("As senhas não coincidem");
      return;
    }

    if (!isPasswordValid) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
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
          await supabase.functions.invoke("rd-station-integration", {
            body: {
              eventType: "user_registered",
              userData: {
                email: formData.email,
                name: formData.name,
                phone: formData.phone,
                city: formData.city,
                state: formData.state,
                tags: ["novo_usuario", "criador_conta"],
              },
            },
          });
        } catch (rdError) {
          console.error("Erro ao enviar para RD Station:", rdError);
        }

        // Resgatar cupom se fornecido
        if (couponCode && isValidCouponFormat) {
          try {
            await supabase.functions.invoke("redeem-coupon", {
              body: { couponCode, userId: data.user.id },
            });
            toast.success("Cupom resgatado com sucesso!");
          } catch (couponError) {
            console.error("Erro ao resgatar cupom:", couponError);
          }
        }

        // Redirecionar direto ao dashboard (sem exigir equipe)
        setWaitingForAuth(true);
      }
    } catch (err) {
      toast.error("Ocorreu um erro ao tentar se cadastrar.");
    } finally {
      setLoading(false);
    }
  };

  // Renderização direta do formulário de login (sem useMemo para evitar conflitos DOM)
  const loginFormContent = (
    <form ref={loginFormRef} onSubmit={handleLogin} className="space-y-4 sm:space-y-6">
      <div className="space-y-2">
        <div className="relative">
          <Mail className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
          <Input
            id="login-email"
            type="email"
            placeholder={t.login.email}
            required
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            className="pl-9 sm:pl-10 h-9 sm:h-10 text-sm"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="relative">
          <Lock className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
          <Input
            id="login-password"
            type={showPassword ? "text" : "password"}
            placeholder={t.login.password}
            required
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            className="pl-9 sm:pl-10 pr-9 sm:pr-10 h-9 sm:h-10 text-sm"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute top-1/2 -translate-y-1/2 right-0.5 h-8 w-8 sm:h-9 sm:w-9 text-muted-foreground hover:bg-accent/60"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? (
              <EyeOff size={16} className="sm:w-5 sm:h-5" />
            ) : (
              <Eye size={16} className="sm:w-5 sm:h-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Sugestão de reset - sempre renderizado, visibilidade controlada por CSS */}
      <div 
        className={`mb-4 p-4 bg-destructive/10 border-2 border-destructive/30 rounded-lg transition-all duration-300 ${
          showPasswordResetSuggestion ? 'opacity-100 max-h-40' : 'opacity-0 max-h-0 overflow-hidden p-0 mb-0 border-0'
        }`}
        aria-hidden={!showPasswordResetSuggestion}
      >
        <div className="flex items-start gap-3">
          <Mail className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-destructive mb-1">{t.login.incorrectCredentials}</p>
            <p className="text-xs text-muted-foreground mb-2">{t.login.resetPasswordSuggestion}</p>
            <a
              href="/forgot-password"
              className="text-sm text-destructive hover:text-destructive/80 font-semibold underline underline-offset-2"
            >
              {t.login.resetMyPassword}
            </a>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0">
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

      <div className="pt-4 sm:pt-6">
        <Button
          type="submit"
          disabled={loading}
          className="w-full h-9 sm:h-10 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-medium rounded-lg sm:rounded-xl transition-all duration-300 hover:opacity-90 disabled:opacity-50 text-sm"
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
      </div>
    </form>
  );


  // Renderização direta do formulário de registro (sem useMemo para evitar conflitos DOM)
  const registerFormContent = (
    <form ref={registerFormRef} onSubmit={handleRegister} className="space-y-4">
      {/* Grupo 1: Informações Pessoais */}
      <div className="space-y-3 p-4 rounded-lg bg-muted/20 border border-border/40">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Informações Pessoais
        </Label>
        <div className="relative">
          <User className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
          <Input
            id="name"
            placeholder="Nome Completo"
            required
            value={formData.name}
            onChange={handleInputChange}
            className="pl-9 sm:pl-10 h-9 sm:h-10 text-sm"
          />
        </div>

        <div className="relative">
          <Mail className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            placeholder="E-mail"
            required
            value={formData.email}
            onChange={handleInputChange}
            className="pl-9 sm:pl-10 h-9 sm:h-10 text-sm"
          />
        </div>
      </div>

      {/* Grupo 2: Segurança */}
      <div className="space-y-3 p-4 rounded-lg bg-muted/20 border border-border/40">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Segurança</Label>
        <div className="flex flex-col sm:grid sm:grid-cols-2 gap-2">
          <div className="relative">
            <Lock className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="Senha"
              required
              minLength={6}
              value={formData.password}
              onChange={handleInputChange}
              className="pl-9 sm:pl-10 pr-9 sm:pr-10 h-9 sm:h-10 text-sm"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-0.5 top-1/2 transform -translate-y-1/2 h-8 w-8"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
            </Button>
          </div>

          <div className="relative">
            <Lock className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
            <Input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              placeholder="Confirmar Senha"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-9 sm:pl-10 h-9 sm:h-10 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Validação de senha - sempre renderizado, visibilidade controlada por CSS */}
      <div 
        className={`bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 p-2 sm:p-3 rounded-lg border border-green-200/50 dark:border-green-800/50 transition-all duration-300 ${
          formData.password ? 'opacity-100 max-h-20' : 'opacity-0 max-h-0 overflow-hidden p-0 border-0'
        }`}
        aria-hidden={!formData.password}
      >
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1.5 sm:gap-2">
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <div
              className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex items-center justify-center transition-all ${isPasswordValid ? "bg-green-500" : "bg-red-500"}`}
            >
              {isPasswordValid && <span className="text-white text-[8px] sm:text-[10px]">✓</span>}
            </div>
            <span
              className={`font-medium transition-colors ${isPasswordValid ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}
            >
              Mínimo 6 caracteres
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <div
              className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full flex items-center justify-center transition-all ${passwordsMatch ? "bg-green-500" : "bg-red-500"}`}
            >
              {passwordsMatch && <span className="text-white text-[8px] sm:text-[10px]">✓</span>}
            </div>
            <span
              className={`font-medium transition-colors ${passwordsMatch ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}
            >
              Senhas coincidem
            </span>
          </div>
        </div>
      </div>

      {/* Grupo 3: Informações de Contato */}
      <div className="space-y-3 p-4 rounded-lg bg-muted/20 border border-border/40">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Informações de Contato
        </Label>
        <div className="relative">
          <Phone className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
          <Input
            id="phone"
            placeholder="Telefone"
            required
            value={formData.phone}
            onChange={handleInputChange}
            className="pl-9 sm:pl-10 h-9 sm:h-10 text-sm"
            maxLength={15}
          />
        </div>

        {/* Select nativo para evitar conflitos com extensões de navegador */}
        <div className="relative">
          <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <select
            value={formData.state}
            onChange={(e) => handleSelectChange("state", e.target.value)}
            disabled={loadingStates}
            className="w-full h-9 sm:h-10 text-sm px-3 pr-10 rounded-md border border-input bg-background text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            data-lpignore="true"
            data-1p-ignore="true"
            autoComplete="off"
          >
            <option value="" disabled>Estado</option>
            {states.map((state) => (
              <option key={state.id} value={state.sigla}>
                {state.nome}
              </option>
            ))}
          </select>
        </div>

        {/* Select de cidade - sempre renderizado, visibilidade controlada por CSS */}
        <div className={`transition-all duration-300 ${formData.state ? 'opacity-100 max-h-20' : 'opacity-0 max-h-0 overflow-hidden'}`}>
          <div className="relative">
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <select
              value={formData.city}
              onChange={(e) => handleSelectChange("city", e.target.value)}
              disabled={loadingCities || !formData.state}
              className="w-full h-9 sm:h-10 text-sm px-3 pr-10 rounded-md border border-input bg-background text-foreground appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              data-lpignore="true"
              data-1p-ignore="true"
              autoComplete="off"
            >
              <option value="" disabled>Cidade</option>
              {cities.map((city) => (
                <option key={city.id} value={city.nome}>
                  {city.nome}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Grupo 4: Cupom (Opcional) */}
      <div className="space-y-3 p-4 rounded-lg bg-muted/20 border border-border/40">
        <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Cupom (Opcional)
        </Label>
        <div className="relative">
          <Ticket className="absolute left-2.5 sm:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
          <Input
            id="couponCode"
            placeholder="Digite seu cupom"
            value={couponCode}
            onChange={handleCouponInput}
            className="pl-9 sm:pl-10 h-9 sm:h-10 text-sm font-mono tracking-wider"
            maxLength={30}
          />
        </div>
        {/* Validação de cupom - sempre renderizado, visibilidade controlada por CSS */}
        <p className={`text-xs transition-all duration-200 ${couponCode ? 'opacity-100 h-auto' : 'opacity-0 h-0 overflow-hidden'}`}>
          {isValidCouponFormat ? (
            <span className="text-green-600 font-medium">✓ Formato válido</span>
          ) : (
            <span className="text-amber-600">Ex: nome200 ou XX-YYYYYY-CC</span>
          )}
        </p>
      </div>

      <div className="space-y-4 pt-4 sm:pt-6">
        <div className="flex items-start gap-2">
          <Checkbox
            id="privacy"
            checked={privacyChecked}
            onCheckedChange={() => {
              setPrivacyModalOpen(true);
            }}
            className="mt-1"
          />
          <Label 
            htmlFor="privacy" 
            className="text-xs text-muted-foreground select-none cursor-pointer leading-relaxed"
            onClick={(e) => {
              e.preventDefault();
              setPrivacyModalOpen(true);
            }}
          >
            Li e concordo com a{" "}
            <button
              type="button"
              className="underline text-primary hover:text-secondary transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                setPrivacyModalOpen(true);
              }}
            >
              Política de Privacidade
            </button>
          </Label>
        </div>

        <Button
          type="submit"
          className="w-full h-10 lg:h-11 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-medium rounded-xl transition-all duration-300 hover:opacity-90"
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
      </div>
    </form>
  );


  return (
    <>
      <div className="min-h-screen flex flex-col items-center justify-start py-8 relative overflow-y-auto bg-gradient-to-br from-background via-purple-50/5 to-pink-50/10 dark:via-purple-950/5 dark:to-pink-950/10 p-4 sm:p-6">
        {/* Elementos decorativos animados com motion blur */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Bolinhas de fundo sutis */}
          <motion.div
            className="absolute top-20 -left-20 w-96 h-96 rounded-full"
            style={{
              background:
                "radial-gradient(circle, hsl(var(--primary) / 0.25) 0%, hsl(330 100% 50% / 0.1) 70%, transparent 100%)",
              filter: "blur(50px) sm:blur(70px)",
            }}
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
            className="absolute bottom-20 -right-20 w-[500px] h-[500px] rounded-full"
            style={{
              background:
                "radial-gradient(circle, hsl(190 100% 50% / 0.2) 0%, hsl(220 100% 50% / 0.1) 70%, transparent 100%)",
              filter: "blur(60px) sm:blur(90px)",
            }}
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

          {/* Apenas 3 logos flutuantes bem distribuídos */}
          <motion.img
            src={decorativeElement}
            alt=""
            className="absolute top-[10%] right-[8%] w-64 h-64 sm:w-72 sm:h-72 object-contain opacity-8"
            style={{ filter: "blur(12px)" }}
            animate={{
              y: [0, -35, 35, 0],
              rotate: [0, 12, -12, 0],
              scale: [1, 1.08, 0.92, 1],
            }}
            transition={{
              duration: 22,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />

          <motion.img
            src={decorativeElement}
            alt=""
            className="absolute top-[45%] left-[6%] w-56 h-56 sm:w-68 sm:h-68 object-contain opacity-8"
            style={{ filter: "blur(12px)" }}
            animate={{
              x: [0, 30, -30, 0],
              y: [0, -40, 25, 0],
              rotate: [0, -15, 15, 0],
              scale: [1, 0.95, 1.1, 1],
            }}
            transition={{
              duration: 25,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1.5,
            }}
          />

          <motion.img
            src={decorativeElement}
            alt=""
            className="absolute bottom-[15%] right-[10%] w-60 h-60 sm:w-70 sm:h-70 object-contain opacity-8"
            style={{ filter: "blur(12px)" }}
            animate={{
              x: [0, -40, 40, 0],
              y: [0, 45, -30, 0],
              rotate: [0, -18, 18, 0],
              scale: [1, 1.1, 0.88, 1],
            }}
            transition={{
              duration: 24,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 3,
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
          {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </Button>
        {/* Container centralizado para Logo + Card */}
        <div className="flex flex-col items-center gap-6 sm:gap-8 z-10 w-full max-w-[95%] sm:max-w-md">
          {/* Logo no topo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex-shrink-0"
          >
            <CreatorLogo />
          </motion.div>

          {/* Card de auth centralizado - Responsivo para todos os dispositivos */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="w-full relative flex-shrink-0"
          >
            <div className="bg-card/80 backdrop-blur-xl rounded-t-3xl sm:rounded-2xl shadow-2xl border border-primary/10 p-4 sm:p-6 md:p-8 flex flex-col">
              {/* Novo Sistema de Tabs Modernas */}
              <div className="flex mb-4 sm:mb-6 flex-shrink-0">
                <button
                  onClick={() => setIsLoginMode(true)}
                  className={`flex-1 pb-3 text-center font-semibold transition-all relative ${
                    isLoginMode ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Login
                  {isLoginMode && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                      }}
                    />
                  )}
                </button>
                <button
                  onClick={() => setIsLoginMode(false)}
                  className={`flex-1 pb-3 text-center font-semibold transition-all relative ${
                    !isLoginMode ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Cadastro
                  {!isLoginMode && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                      }}
                    />
                  )}
                </button>
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

              <div className="flex-1 min-h-0 -mx-1 px-1">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={isLoginMode ? "login" : "register"}
                    initial={{
                      opacity: 0,
                      y: 15,
                      filter: "blur(4px)",
                      scale: 0.96,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      filter: "blur(0px)",
                      scale: 1,
                    }}
                    exit={{
                      opacity: 0,
                      y: -15,
                      filter: "blur(4px)",
                      scale: 0.96,
                      transition: { duration: 0.2, ease: [0.4, 0, 0.6, 1] },
                    }}
                    transition={{
                      duration: 0.4,
                      ease: [0.16, 1, 0.3, 1],
                      filter: { duration: 0.3 },
                    }}
                  >
                    {isLoginMode ? loginFormContent : registerFormContent}
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </div>{" "}
        {/* Fim do container centralizado */}
      </div>

      {/* Modal de Política de Privacidade - Melhorado para Mobile/Tablet */}
      <Dialog open={privacyModalOpen} onOpenChange={setPrivacyModalOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg w-full max-h-[calc(100vh-2rem)] p-0 flex flex-col overflow-hidden">
          {/* Header Fixo */}
          <DialogHeader className="flex-shrink-0 bg-background border-b p-4 sm:p-6 pb-3 sm:pb-4">
            <DialogTitle className="text-base sm:text-lg font-bold leading-tight pr-8 text-foreground">
              Política de Privacidade – Uso de Dados e IA
            </DialogTitle>
          </DialogHeader>

          {/* Conteúdo Scrollável com Fade Indicator */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden px-4 py-3 sm:px-6 sm:py-4 scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent relative">
            <div className="space-y-3 sm:space-y-4 text-sm text-muted-foreground pb-8">
              <p className="font-medium text-foreground text-sm leading-relaxed">
                👋 Olá! Antes de usar nossa plataforma, é importante que você saiba como cuidamos dos seus dados:
              </p>
              <ul className="list-disc pl-4 sm:pl-5 space-y-2.5 sm:space-y-3">
                <li className="leading-relaxed text-sm">
                  <span className="font-semibold text-foreground">O que coletamos:</span> informações de cadastro (nome,
                  e-mail, telefone), dados de navegação, histórico de uso e, quando necessário, informações de
                  pagamento.
                </li>
                <li className="leading-relaxed text-sm">
                  <span className="font-semibold text-foreground">Como usamos:</span> para oferecer e melhorar os
                  serviços, personalizar sua experiência, enviar novidades e cumprir obrigações legais.
                </li>
                <li className="leading-relaxed text-sm">
                  <span className="font-semibold text-foreground">Inteligência Artificial:</span> usamos IA para
                  recomendar conteúdos, apoiar no suporte e ajudar na criação de materiais. Mas sempre com transparência
                  e sem usar dados sensíveis sem sua permissão.
                </li>
                <li className="leading-relaxed text-sm">
                  <span className="font-semibold text-foreground">Compartilhamento:</span> nunca vendemos seus dados. Só
                  compartilhamos com parceiros essenciais para o funcionamento da plataforma ou quando a lei exigir.
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

            {/* Fade Indicator - Gradiente no final do scroll */}
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none" />
          </div>

          {/* Footer Fixo com Botões Sempre Visíveis */}
          <DialogFooter className="flex-shrink-0 bg-background border-t shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] p-4 sm:p-6 pt-3 sm:pt-4">
            <div className="flex flex-col-reverse sm:flex-row gap-3 w-full">
              <Button
                variant="outline"
                onClick={() => {
                  setPrivacyModalOpen(false);
                  setPrivacyChecked(false);
                  setPrivacyAccepted(false);
                }}
                className="flex-1 h-12 text-sm font-medium"
              >
                Recusar
              </Button>
              <Button
                onClick={() => {
                  setPrivacyChecked(true);
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
