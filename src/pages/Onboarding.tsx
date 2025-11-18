import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CreatorLogo } from "@/components/CreatorLogo";
import { Eye, EyeOff, User, Mail, Phone, Lock, Loader2, CheckCircle, Building2, Code } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PlanSelector } from "@/components/subscription/PlanSelector";
import { cn } from "@/lib/utils";

interface State {
  id: number;
  sigla: string;
  nome: string;
}

interface City {
  id: number;
  nome: string;
}

type Step = 'register' | 'team' | 'plan';

const Onboarding = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<Step>('register');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Dados do registro
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    state: "",
    city: "",
  });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [userData, setUserData] = useState<any>(null);
  
  // Dados da equipe
  const [teamName, setTeamName] = useState("");
  const [teamCode, setTeamCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [teamData, setTeamData] = useState<any>(null);
  
  // Estados e cidades
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loadingStates, setLoadingStates] = useState(true);
  const [loadingCities, setLoadingCities] = useState(false);
  
  // Política de privacidade
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);

  // Validações
  const passwordsMatch = formData.password === confirmPassword;
  const isPasswordValid = formData.password && formData.password.length >= 6;

  // Buscar estados
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

  // Buscar cidades quando estado é selecionado
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    if (id === "phone") {
      const cleaned = value.replace(/\D/g, "");
      let formatted = cleaned;
      if (cleaned.length <= 11) {
        if (cleaned.length > 6) {
          formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
        } else if (cleaned.length > 2) {
          formatted = `(${cleaned.slice(0, 2)}) ${cleaned.slice(2)}`;
        }
      }
      setFormData((prev) => ({ ...prev, phone: formatted }));
    } else {
      setFormData((prev) => ({ ...prev, [id]: value }));
    }
  };

  const handleSelectChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (field === "state") {
      setFormData((prev) => ({ ...prev, city: "" }));
    }
  };

  const handleRegister = async () => {
    if (!formData.name || !formData.email || !formData.password) {
      toast.error("Por favor, preencha todos os campos obrigatórios");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    if (!passwordsMatch) {
      toast.error("As senhas não coincidem");
      return;
    }

    if (!privacyChecked) {
      toast.error("Você precisa aceitar a política de privacidade");
      return;
    }

    setIsLoading(true);

    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name: formData.name,
            phone: formData.phone,
            state: formData.state,
            city: formData.city,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        setUserData(data.user);
        toast.success("Cadastro realizado com sucesso!");
        setCurrentStep('team');
      }
    } catch (error: any) {
      console.error("Erro no cadastro:", error);
      toast.error(error.message || "Erro ao criar conta");
    } finally {
      setIsLoading(false);
    }
  };

  const generateRandomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  };

  const handleCreateTeam = async () => {
    if (!teamName.trim()) {
      toast.error("Por favor, insira o nome da equipe");
      return;
    }

    if (!teamCode.trim()) {
      toast.error("Por favor, crie um código de acesso");
      return;
    }

    if (!userData) {
      toast.error("Sessão não encontrada. Por favor, faça login novamente.");
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.rpc('create_team_for_user', {
        p_user_id: userData.id,
        p_team_name: teamName,
        p_team_code: teamCode,
        p_plan_id: 'free'
      });

      if (error) throw error;

      console.log("Equipe criada:", data);
      setTeamData(data);
      toast.success("Equipe criada com sucesso! Escolha seu plano.");
      setCurrentStep('plan');
    } catch (error: any) {
      console.error("Erro ao criar equipe:", error);
      toast.error(error.message || "Erro ao criar equipe");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlanSelected = async (planId: string) => {
    // Se for plano free, vai direto para login
    if (planId === 'free') {
      toast.success("Conta criada com sucesso! Faça login para continuar.");
      navigate('/');
      return;
    }

    // Para planos pagos, o PlanSelector já redireciona para Stripe
    console.log("Plano selecionado:", planId);
  };

  const renderStepIndicator = () => {
    const steps = [
      { id: 'register', label: 'Cadastro', icon: User },
      { id: 'team', label: 'Equipe', icon: Building2 },
      { id: 'plan', label: 'Plano', icon: CheckCircle },
    ];

    return (
      <div className="flex items-center justify-center mb-8 gap-2">
        {steps.map((step, index) => {
          const Icon = step.icon;
          const isActive = currentStep === step.id;
          const isCompleted = 
            (step.id === 'register' && (currentStep === 'team' || currentStep === 'plan')) ||
            (step.id === 'team' && currentStep === 'plan');

          return (
            <div key={step.id} className="flex items-center">
              <div className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full transition-colors",
                isActive && "bg-primary text-primary-foreground",
                isCompleted && "bg-primary/20 text-primary",
                !isActive && !isCompleted && "bg-muted text-muted-foreground"
              )}>
                <Icon className="h-4 w-4" />
                <span className="text-sm font-medium">{step.label}</span>
              </div>
              {index < steps.length - 1 && (
                <div className={cn(
                  "w-8 h-0.5 mx-2",
                  isCompleted ? "bg-primary" : "bg-muted"
                )} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderRegisterStep = () => (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Criar Conta</CardTitle>
        <CardDescription>Preencha seus dados para começar</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome Completo *</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="name"
                placeholder="Seu nome"
                value={formData.name}
                onChange={handleInputChange}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail *</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={handleInputChange}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha *</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Mínimo 6 caracteres"
                value={formData.password}
                onChange={handleInputChange}
                className="pl-10 pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {formData.password && (
              <p className={cn("text-xs", isPasswordValid ? "text-green-600" : "text-red-600")}>
                {isPasswordValid ? "✓ Senha válida" : "✗ Mínimo 6 caracteres"}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Senha *</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                placeholder="Repita sua senha"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="pl-10"
              />
            </div>
            {confirmPassword && (
              <p className={cn("text-xs", passwordsMatch ? "text-green-600" : "text-red-600")}>
                {passwordsMatch ? "✓ Senhas coincidem" : "✗ Senhas não coincidem"}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="phone"
                placeholder="(00) 00000-0000"
                value={formData.phone}
                onChange={handleInputChange}
                className="pl-10"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="state">Estado</Label>
            <Select value={formData.state} onValueChange={(value) => handleSelectChange("state", value)}>
              <SelectTrigger>
                <SelectValue placeholder={loadingStates ? "Carregando..." : "Selecione"} />
              </SelectTrigger>
              <SelectContent>
                {states.map((state) => (
                  <SelectItem key={state.sigla} value={state.sigla}>
                    {state.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">Cidade</Label>
            <Select 
              value={formData.city} 
              onValueChange={(value) => handleSelectChange("city", value)}
              disabled={!formData.state}
            >
              <SelectTrigger>
                <SelectValue placeholder={loadingCities ? "Carregando..." : "Selecione"} />
              </SelectTrigger>
              <SelectContent>
                {cities.map((city) => (
                  <SelectItem key={city.id} value={city.nome}>
                    {city.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-start space-x-2 pt-4">
          <Checkbox
            id="privacy"
            checked={privacyChecked}
            onCheckedChange={(checked) => setPrivacyChecked(checked as boolean)}
          />
          <label htmlFor="privacy" className="text-sm text-muted-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
            Eu li e aceito a{" "}
            <button
              type="button"
              onClick={() => setPrivacyModalOpen(true)}
              className="text-primary underline hover:text-primary/80"
            >
              política de privacidade
            </button>
          </label>
        </div>

        <Button
          onClick={handleRegister}
          disabled={isLoading || !privacyChecked}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Criando conta...
            </>
          ) : (
            "Criar Conta"
          )}
        </Button>

        <div className="text-center text-sm text-muted-foreground">
          Já tem uma conta?{" "}
          <button
            onClick={() => navigate('/')}
            className="text-primary underline hover:text-primary/80"
          >
            Fazer login
          </button>
        </div>
      </CardContent>
    </Card>
  );

  const renderTeamStep = () => (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>Criar Equipe</CardTitle>
        <CardDescription>Configure sua equipe para começar a criar conteúdo</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="teamName">Nome da Equipe *</Label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="teamName"
              placeholder="Nome da sua equipe"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="teamCode">Código de Acesso *</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Code className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="teamCode"
                type={showCode ? "text" : "password"}
                placeholder="Código único da equipe"
                value={teamCode}
                onChange={(e) => setTeamCode(e.target.value.toUpperCase())}
                className="pl-10 pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                onClick={() => setShowCode(!showCode)}
              >
                {showCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => setTeamCode(generateRandomCode())}
            >
              Gerar
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Este código será usado para outros membros entrarem na equipe
          </p>
        </div>

        <div className="bg-muted/50 p-4 rounded-lg space-y-2">
          <p className="text-sm font-medium">🎁 Bônus de Boas-vindas</p>
          <p className="text-xs text-muted-foreground">
            Sua equipe receberá 20 créditos grátis para começar!
          </p>
        </div>

        <Button
          onClick={handleCreateTeam}
          disabled={isLoading || !teamName.trim() || !teamCode.trim()}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Criando equipe...
            </>
          ) : (
            "Criar Equipe e Continuar"
          )}
        </Button>
      </CardContent>
    </Card>
  );

  const renderPlanStep = () => (
    <div className="w-full max-w-6xl mx-auto space-y-6">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Escolha seu Plano</h2>
        <p className="text-muted-foreground">
          Selecione o plano ideal para sua equipe. Você pode começar com o plano gratuito.
        </p>
      </div>
      
      <PlanSelector 
        onPlanSelected={handlePlanSelected}
        showCurrentPlan={false}
      />

      <div className="text-center">
        <Button
          variant="ghost"
          onClick={() => {
            toast.success("Conta criada! Faça login para continuar.");
            navigate('/');
          }}
        >
          Pular e usar plano gratuito
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center mb-8">
          <CreatorLogo />
        </div>

        {renderStepIndicator()}

        {currentStep === 'register' && renderRegisterStep()}
        {currentStep === 'team' && renderTeamStep()}
        {currentStep === 'plan' && renderPlanStep()}

        {/* Política de Privacidade Modal */}
        <Dialog open={privacyModalOpen} onOpenChange={setPrivacyModalOpen}>
          <DialogContent className="max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Política de Privacidade</DialogTitle>
            </DialogHeader>
            <div className="prose prose-sm max-w-none">
              <p>
                Esta política de privacidade descreve como coletamos, usamos e protegemos suas
                informações pessoais...
              </p>
              {/* Adicione o conteúdo completo da política aqui */}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Onboarding;
