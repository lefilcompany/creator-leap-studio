import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CreatorLogo } from "@/components/CreatorLogo";
import { CreateTeamDialog } from "@/components/auth/CreateTeamDialog";
import { PlanSelector } from "@/components/subscription/PlanSelector";
import { AuthModeToggle } from "@/components/auth/AuthModeToggle";
import { Loader2, AlertTriangle, CheckCircle, Eye, EyeOff, User, Mail, Phone, Lock } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { getEmailRedirectUrl } from "@/lib/auth-urls";

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

export default function Subscribe() {
  const { user, team, isLoading: authLoading, reloadUserData } = useAuth();
  const navigate = useNavigate();
  const [showCreateTeam, setShowCreateTeam] = useState(false);
  const [currentStep, setCurrentStep] = useState<'auth' | 'team' | 'plan'>('auth');
  
  // Auth mode (login or register)
  const [isLoginMode, setIsLoginMode] = useState(true);
  
  // Login state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);
  
  // Register state
  const [registerData, setRegisterData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    state: "",
    city: "",
  });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [privacyChecked, setPrivacyChecked] = useState(false);
  
  // IBGE data
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loadingStates, setLoadingStates] = useState(true);
  const [loadingCities, setLoadingCities] = useState(false);

  // Busca os estados do Brasil
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

  // Busca as cidades quando um estado é selecionado
  useEffect(() => {
    if (registerData.state) {
      setLoadingCities(true);
      setCities([]);
      fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${registerData.state}/municipios`)
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
  }, [registerData.state]);

  // Verificar cancelamento de pagamento
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('canceled') === 'true') {
      toast.info('Pagamento cancelado. Você pode tentar novamente quando quiser.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  // Determinar o passo atual baseado no estado da autenticação
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      setCurrentStep('auth');
    } else if (!team) {
      setCurrentStep('team');
      setShowCreateTeam(true);
    } else {
      setCurrentStep('plan');
    }
  }, [user, team, authLoading]);

  // Login handler
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password: loginPassword,
      });
      
      if (error) {
        toast.error("Email ou senha inválidos");
        return;
      }

      if (data.user) {
        toast.success("Login realizado com sucesso!");
        await reloadUserData();
      }
    } catch (err) {
      toast.error("Erro ao fazer login");
    } finally {
      setLoginLoading(false);
    }
  };

  // Register handler
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!privacyChecked) {
      toast.error("É necessário aceitar a Política de Privacidade");
      return;
    }
    if (registerData.password !== confirmPassword) {
      toast.error("As senhas não coincidem");
      return;
    }
    if (registerData.password.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres");
      return;
    }

    setRegisterLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signUp({
        email: registerData.email,
        password: registerData.password,
        options: {
          data: {
            name: registerData.name,
            phone: registerData.phone,
            state: registerData.state,
            city: registerData.city,
          },
          emailRedirectTo: getEmailRedirectUrl('/subscribe'),
        },
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      if (data.user) {
        toast.success("Cadastro realizado com sucesso!");
        await reloadUserData();
      }
    } catch (err) {
      toast.error("Erro ao fazer cadastro");
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleRegisterInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setRegisterData((prev) => ({ ...prev, [id]: formatted }));
    } else {
      setRegisterData((prev) => ({ ...prev, [id]: value }));
    }
  };

  const handleSelectChange = (field: "state" | "city", value: string) => {
    const updatedData = { ...registerData, [field]: value };
    if (field === "state") {
      updatedData.city = "";
    }
    setRegisterData(updatedData);
  };

  // Verificar se usuário é admin da equipe
  const isAdmin = user && team && team.admin_id === user.id;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Caso 1: Usuário não autenticado
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-2xl space-y-8"
        >
          <div className="text-center space-y-4">
            <CreatorLogo className="mx-auto" />
            <h1 className="text-3xl font-bold tracking-tight">
              Bem-vindo ao Creator
            </h1>
            <p className="text-muted-foreground">
              Para assinar um plano, crie sua conta ou faça login
            </p>
          </div>

          <Card className="border-border/50 shadow-xl">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <AuthModeToggle isLoginMode={isLoginMode} onToggle={setIsLoginMode} />
              </div>
              <CardTitle>{isLoginMode ? "Entrar" : "Criar Conta"}</CardTitle>
              <CardDescription>
                {isLoginMode 
                  ? "Entre com suas credenciais" 
                  : "Preencha seus dados para começar"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoginMode ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">E-mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-email"
                        type="email"
                        placeholder="seu@email.com"
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="login-password"
                        type={showLoginPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="pl-10 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={loginLoading}>
                    {loginLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Entrando...
                      </>
                    ) : (
                      "Entrar"
                    )}
                  </Button>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-name">Nome Completo *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="name"
                        placeholder="Seu nome"
                        value={registerData.name}
                        onChange={handleRegisterInputChange}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-email">E-mail *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="seu@email.com"
                        value={registerData.email}
                        onChange={handleRegisterInputChange}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="(00) 00000-0000"
                        value={registerData.phone}
                        onChange={handleRegisterInputChange}
                        className="pl-10"
                        maxLength={15}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="state">Estado</Label>
                      <Select
                        value={registerData.state}
                        onValueChange={(value) => handleSelectChange("state", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {loadingStates ? (
                            <SelectItem value="loading" disabled>Carregando...</SelectItem>
                          ) : (
                            states.map((state) => (
                              <SelectItem key={state.id} value={state.sigla}>
                                {state.nome}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="city">Cidade</Label>
                      <Select
                        value={registerData.city}
                        onValueChange={(value) => handleSelectChange("city", value)}
                        disabled={!registerData.state}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {loadingCities ? (
                            <SelectItem value="loading" disabled>Carregando...</SelectItem>
                          ) : (
                            cities.map((city) => (
                              <SelectItem key={city.id} value={city.nome}>
                                {city.nome}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">Senha *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="password"
                        type={showRegisterPassword ? "text" : "password"}
                        placeholder="Mínimo 6 caracteres"
                        value={registerData.password}
                        onChange={handleRegisterInputChange}
                        className="pl-10 pr-10"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showRegisterPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirm-password">Confirmar Senha *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirm-password"
                        type={showRegisterPassword ? "text" : "password"}
                        placeholder="Confirme sua senha"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10 pr-10"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex items-start space-x-2">
                    <Checkbox
                      id="privacy"
                      checked={privacyChecked}
                      onCheckedChange={(checked) => setPrivacyChecked(checked as boolean)}
                    />
                    <Label htmlFor="privacy" className="text-sm leading-tight cursor-pointer">
                      Aceito a{" "}
                      <a href="/privacy" target="_blank" className="text-primary hover:underline">
                        Política de Privacidade
                      </a>
                    </Label>
                  </div>

                  <Button type="submit" className="w-full" disabled={registerLoading}>
                    {registerLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Criando conta...
                      </>
                    ) : (
                      "Criar Conta"
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Caso 2: Usuário autenticado mas sem equipe
  if (!team) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md space-y-8"
        >
          <div className="text-center space-y-4">
            <CreatorLogo className="mx-auto" />
            <h1 className="text-3xl font-bold tracking-tight">
              Criar Sua Equipe
            </h1>
            <p className="text-muted-foreground">
              Para assinar um plano, você precisa criar uma equipe primeiro.
            </p>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Mais Um Passo</AlertTitle>
            <AlertDescription>
              Crie sua equipe para gerenciar créditos, membros e conteúdos de forma organizada.
            </AlertDescription>
          </Alert>
        </motion.div>

        <CreateTeamDialog
          open={showCreateTeam}
          onClose={() => {
            setShowCreateTeam(false);
            navigate('/dashboard');
          }}
          onSuccess={async () => {
            await reloadUserData();
            setShowCreateTeam(false);
            setCurrentStep('plan');
          }}
          context="onboarding"
        />
      </div>
    );
  }

  // Caso 3: Usuário tem equipe mas não é admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-background via-background to-primary/5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md space-y-8"
        >
          <div className="text-center space-y-4">
            <CreatorLogo className="mx-auto" />
          </div>

          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Acesso Restrito</AlertTitle>
            <AlertDescription className="space-y-4">
              <p>
                Apenas o administrador da equipe pode assinar planos.
              </p>
              <p className="text-sm">
                Entre em contato com o administrador da sua equipe para fazer upgrade.
              </p>
            </AlertDescription>
          </Alert>

          <Button
            className="w-full"
            onClick={() => navigate('/dashboard')}
          >
            Ir para o Dashboard
          </Button>
        </motion.div>
      </div>
    );
  }

  // Caso 4: Equipe já tem plano ativo - permitir visualizar para upgrade
  const hasActivePaidPlan = team.subscription_status === 'active' && team.plan.id !== 'free';

  // Caso 5: Usuário autenticado, tem equipe, é admin - mostrar seleção de planos
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto py-12 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-8"
        >
          <div className="text-center space-y-4">
            <CreatorLogo className="mx-auto" />
            <h1 className="text-4xl font-bold tracking-tight">
              Escolha Seu Plano
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Selecione o plano ideal para sua equipe e comece a criar conteúdo incrível.
            </p>
          </div>

          {hasActivePaidPlan && (
            <Alert className="max-w-2xl mx-auto">
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Plano Ativo</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>Sua equipe já possui o plano <strong>{team.plan.name}</strong> ativo.</p>
                <p>Você pode fazer upgrade para um plano superior abaixo.</p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/plans')} 
                  className="mt-2"
                >
                  Gerenciar Plano Atual
                </Button>
              </AlertDescription>
            </Alert>
          )}

          <PlanSelector
            onCheckoutComplete={() => {
              navigate('/dashboard?payment_success=true');
            }}
          />
        </motion.div>
      </div>
    </div>
  );
}
