import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CreatorLogo } from "@/components/CreatorLogo";
import { Eye, EyeOff, User, Mail, Phone, Lock, Loader2, CheckCircle, Building2, Code, LogIn, Package, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PlanSelector } from "@/components/subscription/PlanSelector";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

interface State {
  id: number;
  sigla: string;
  nome: string;
}

interface City {
  id: number;
  nome: string;
}

type OnboardingMode = 'new' | 'existing';
type Step = 'login' | 'register' | 'team' | 'plan';

const Onboarding = () => {
  const navigate = useNavigate();
  const { reloadUserData } = useAuth();
  const [mode, setMode] = useState<OnboardingMode | null>(null);
  const [currentStep, setCurrentStep] = useState<Step>('register');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
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
  
  const [teamName, setTeamName] = useState("");
  const [teamCode, setTeamCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [teamData, setTeamData] = useState<any>(null);
  
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loadingStates, setLoadingStates] = useState(true);
  const [loadingCities, setLoadingCities] = useState(false);
  
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);

  const passwordsMatch = formData.password === confirmPassword;
  const isPasswordValid = formData.password && formData.password.length >= 6;

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

  const handleExistingUserLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Usuário não encontrado");

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, team_id')
        .eq('id', authData.user.id)
        .single();

      if (profileError) throw profileError;

      if (!profile.team_id) {
        toast.error('Você não está em nenhuma equipe', {
          description: 'Crie uma equipe primeiro ou solicite entrada em uma equipe existente.'
        });
        await supabase.auth.signOut();
        setIsLoading(false);
        return;
      }

      const { data: teamInfo, error: teamError } = await supabase
        .from('teams')
        .select('id, name, admin_id, plan_id')
        .eq('id', profile.team_id)
        .single();

      if (teamError) throw teamError;

      if (teamInfo.admin_id !== authData.user.id) {
        toast.error('Acesso negado', {
          description: 'Apenas administradores da equipe podem assinar planos. Contate o administrador da sua equipe.'
        });
        
        await supabase.auth.signOut();
        setIsLoading(false);
        return;
      }

      toast.success(`Bem-vindo${mode === 'new' ? '' : ', administrador da equipe ' + teamInfo.name}!`);
      
      // Recarregar dados do contexto para garantir que user e team estejam disponíveis
      await reloadUserData();
      
      setUserData(authData.user);
      setTeamData(teamInfo);
      setCurrentStep('plan');

    } catch (error: any) {
      console.error('Erro no login:', error);
      toast.error('Erro ao fazer login', {
        description: error.message || 'Verifique suas credenciais e tente novamente.'
      });
    } finally {
      setIsLoading(false);
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
        p_plan_id: 'pack_trial'
      });

      if (error) throw error;

      console.log("Equipe criada:", data);
      setTeamData(data);
      toast.success("Equipe criada com sucesso! Agora faça login para continuar.");
      setCurrentStep('login');
    } catch (error: any) {
      console.error("Erro ao criar equipe:", error);
      toast.error(error.message || "Erro ao criar equipe");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlanSelected = async (planId: string) => {
    console.log('Plano selecionado:', planId);
    
    if (mode) {
      sessionStorage.setItem('onboarding_mode', mode);
    }
    
    if (planId === 'free') {
      toast.success('Plano gratuito ativado!');
      navigate(mode === 'existing' ? '/dashboard' : '/');
    }
  };

  const getSteps = () => {
    if (mode === 'existing') {
      return [
        { id: 'login' as const, label: 'Login', icon: LogIn },
        { id: 'plan' as const, label: 'Plano', icon: Package },
      ];
    }
    
    return [
      { id: 'register' as const, label: 'Cadastro', icon: User },
      { id: 'team' as const, label: 'Equipe', icon: Building2 },
      { id: 'login' as const, label: 'Login', icon: LogIn },
      { id: 'plan' as const, label: 'Plano', icon: Package },
    ];
  };

  const renderStepIndicator = () => {
    const steps = getSteps();
    const currentStepIndex = steps.findIndex(s => s.id === currentStep);

    return (
      <div className="w-full max-w-2xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = index < currentStepIndex;

            return (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all",
                      isActive && "border-primary bg-primary text-primary-foreground",
                      isCompleted && "border-primary bg-primary text-primary-foreground",
                      !isActive && !isCompleted && "border-muted bg-muted text-muted-foreground"
                    )}
                  >
                    {isCompleted ? (
                      <CheckCircle className="h-6 w-6" />
                    ) : (
                      <Icon className="h-6 w-6" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-sm mt-2 font-medium",
                      isActive && "text-primary",
                      !isActive && "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "flex-1 h-0.5 mx-4 transition-colors",
                      index < currentStepIndex ? "bg-primary" : "bg-muted"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome Completo <span className="text-destructive">*</span></Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input id="name" placeholder="Seu nome" className="pl-9" value={formData.name} onChange={handleInputChange} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input id="email" type="email" placeholder="seu@email.com" className="pl-9" value={formData.email} onChange={handleInputChange} required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input id="phone" placeholder="(00) 00000-0000" className="pl-9" value={formData.phone} onChange={handleInputChange} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="state">Estado</Label>
            <Select value={formData.state} onValueChange={(value) => handleSelectChange("state", value)} disabled={loadingStates}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {states.map((state) => (
                  <SelectItem key={state.id} value={state.sigla}>{state.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">Cidade</Label>
            <Select value={formData.city} onValueChange={(value) => handleSelectChange("city", value)} disabled={!formData.state || loadingCities}>
              <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
              <SelectContent>
                {cities.map((city) => (
                  <SelectItem key={city.id} value={city.nome}>{city.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha <span className="text-destructive">*</span></Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" className="pl-9" value={formData.password} onChange={handleInputChange} required />
              <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {formData.password && !isPasswordValid && (<p className="text-sm text-destructive">A senha deve ter pelo menos 6 caracteres</p>)}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Senha <span className="text-destructive">*</span></Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input id="confirmPassword" type={showPassword ? "text" : "password"} placeholder="••••••••" className="pl-9" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
            </div>
            {confirmPassword && !passwordsMatch && (<p className="text-sm text-destructive">As senhas não coincidem</p>)}
          </div>
        </div>
        <div className="flex items-start space-x-2">
          <Checkbox 
            id="privacy" 
            checked={privacyChecked} 
            onCheckedChange={(checked) => {
              setPrivacyModalOpen(true);
            }} 
          />
          <label 
            htmlFor="privacy" 
            className="text-sm leading-none cursor-pointer"
            onClick={(e) => {
              e.preventDefault();
              setPrivacyModalOpen(true);
            }}
          >
            Li e concordo com a{" "}
            <button 
              type="button" 
              onClick={(e) => { 
                e.preventDefault(); 
                e.stopPropagation();
                setPrivacyModalOpen(true); 
              }} 
              className="text-primary hover:underline"
            >
              Política de Privacidade
            </button>
          </label>
        </div>
        <Button onClick={handleRegister} disabled={isLoading || !isPasswordValid || !passwordsMatch || !privacyChecked} className="w-full" size="lg">
          {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Criando conta...</>) : ("Continuar")}
        </Button>
      </CardContent>
    </Card>
  );

  const renderTeamStep = () => (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Criar Equipe</CardTitle>
        <CardDescription>Configure sua equipe e defina um código de acesso único</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="teamName">Nome da Equipe</Label>
          <div className="relative">
            <Building2 className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input id="teamName" placeholder="Ex: Marketing Digital XYZ" className="pl-9" value={teamName} onChange={(e) => setTeamName(e.target.value)} required />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="teamCode">Código de Acesso</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Code className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input id="teamCode" placeholder="Código único" className="pl-9" type={showCode ? "text" : "password"} value={teamCode} onChange={(e) => setTeamCode(e.target.value.toUpperCase())} maxLength={8} required />
              <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShowCode(!showCode)}>
                {showCode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <Button type="button" variant="outline" onClick={() => setTeamCode(generateRandomCode())}>Gerar</Button>
          </div>
          <p className="text-sm text-muted-foreground">Este código será usado por outros membros para entrar na equipe</p>
        </div>
        <div className="bg-muted/50 p-4 rounded-lg space-y-2">
          <h4 className="font-medium text-sm">O que você receberá:</h4>
          <ul className="text-sm space-y-1 text-muted-foreground">
            <li>✅ Plano FREE ativado automaticamente</li>
            <li>✅ 20 créditos de boas-vindas</li>
            <li>✅ Possibilidade de upgrade para planos pagos</li>
          </ul>
        </div>
        <Button onClick={handleCreateTeam} disabled={isLoading || !teamName.trim() || !teamCode.trim()} className="w-full" size="lg">
          {isLoading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" />Criando equipe...</>) : ("Criar Equipe e Continuar")}
        </Button>
      </CardContent>
    </Card>
  );

  const renderPlanStep = () => (
    <div className="w-full">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold mb-2">Escolha seu Plano</h2>
        <p className="text-muted-foreground">{mode === 'existing' ? 'Faça upgrade do seu plano atual' : 'Comece com o plano FREE ou escolha um plano pago'}</p>
      </div>
      <PlanSelector onPlanSelected={handlePlanSelected} showCurrentPlan={mode === 'existing'} />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl space-y-6">
        <div className="flex justify-start mb-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </div>
        <div className="flex justify-center mb-8"><CreatorLogo /></div>
        {!mode && (
          <Card className="w-full max-w-2xl mx-auto">
            <CardHeader className="text-center space-y-4">
              <CardTitle className="text-3xl">Bem-vindo ao Creator</CardTitle>
              <CardDescription className="text-lg">Escolha como você quer começar</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={() => { setMode('new'); setCurrentStep('register'); }} className="w-full h-20 text-lg" size="lg">
                <User className="mr-3 h-6 w-6" />Criar nova conta
              </Button>
              <Button onClick={() => { setMode('existing'); setCurrentStep('login'); }} variant="outline" className="w-full h-20 text-lg" size="lg">
                <LogIn className="mr-3 h-6 w-6" />Já tenho uma conta e quero assinar um plano
              </Button>
            </CardContent>
          </Card>
        )}
        {mode && renderStepIndicator()}
        {currentStep === 'login' && (
          <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>
                {mode === 'existing' ? 'Faça login para assinar um plano' : 'Confirme seu login'}
              </CardTitle>
              <CardDescription>
                {mode === 'existing' 
                  ? 'Entre com seu email e senha para verificar se você é administrador da equipe'
                  : 'Digite seu email e senha para autenticar e continuar'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleExistingUserLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={formData.email} 
                    onChange={(e) => setFormData({...formData, email: e.target.value})} 
                    required 
                    placeholder="seu@email.com" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Input 
                      id="password" 
                      type={showPassword ? "text" : "password"} 
                      value={formData.password} 
                      onChange={(e) => setFormData({...formData, password: e.target.value})} 
                      required 
                      placeholder="••••••••" 
                    />
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent" 
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <Button type="submit" disabled={isLoading} className="w-full" size="lg">
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Continuar
                </Button>
                <div className="text-center">
                  <Button 
                    type="button" 
                    variant="link" 
                    onClick={() => {
                      if (mode === 'existing') {
                        setMode(null);
                        setCurrentStep('register');
                        setFormData({ name: '', email: '', password: '', phone: '', state: '', city: '' });
                      } else {
                        setCurrentStep('team');
                      }
                    }}
                  >
                    Voltar
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
        {mode === 'new' && currentStep === 'register' && renderRegisterStep()}
        {mode === 'new' && currentStep === 'team' && renderTeamStep()}
        {currentStep === 'plan' && renderPlanStep()}
        <Dialog open={privacyModalOpen} onOpenChange={setPrivacyModalOpen}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Política de Privacidade</DialogTitle>
            </DialogHeader>
            <div className="prose prose-sm dark:prose-invert">
              <p>Ao utilizar nossa plataforma, você concorda com os seguintes termos:</p>
              <ul>
                <li>Coletamos apenas informações necessárias para o funcionamento do serviço</li>
                <li>Seus dados pessoais são protegidos e não serão compartilhados com terceiros</li>
                <li>Utilizamos cookies apenas para melhorar sua experiência</li>
                <li>Você pode solicitar a exclusão de seus dados a qualquer momento</li>
              </ul>
            </div>
            <DialogFooter className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setPrivacyModalOpen(false);
                  setPrivacyChecked(false);
                }}
              >
                Recusar
              </Button>
              <Button
                onClick={() => {
                  setPrivacyChecked(true);
                  setPrivacyModalOpen(false);
                }}
              >
                Aceitar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Onboarding;
