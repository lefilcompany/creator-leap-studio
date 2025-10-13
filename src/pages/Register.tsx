import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { CreatorLogo } from "@/components/CreatorLogo";
import { Eye, EyeOff, User, Mail, Phone, Lock, Loader2, Chrome, Facebook, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { TeamSelectionDialog } from "@/components/auth/TeamSelectionDialog";
import { useOAuthCallback } from "@/hooks/useOAuthCallback";
import { useIsMobile } from "@/hooks/use-mobile";

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

const Register = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    state: "",
    city: "",
  });
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  // Estados e cidades do IBGE
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [loadingStates, setLoadingStates] = useState(true);
  const [loadingCities, setLoadingCities] = useState(false);

  // Política de privacidade
  const [privacyChecked, setPrivacyChecked] = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  // Team selection
  const [showTeamSelection, setShowTeamSelection] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [facebookLoading, setFacebookLoading] = useState(false);

  const { showTeamDialog: oauthTeamDialog, handleTeamDialogClose: handleOAuthTeamDialogClose } = useOAuthCallback();
  
  const isMobile = useIsMobile();
  const [sheetOpen, setSheetOpen] = useState(false);

  // Validações de senha
  const passwordsMatch = formData.password === confirmPassword;
  const isPasswordValid = formData.password && formData.password.length >= 6;

  // Busca os estados do Brasil na API do IBGE
  useEffect(() => {
    fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome')
      .then(res => res.json())
      .then((data: State[]) => {
        setStates(data);
        setLoadingStates(false);
      })
      .catch(() => {
        setLoadingStates(false);
        toast.error('Erro ao carregar estados');
      });
  }, []);

  // Busca as cidades sempre que um estado é selecionado
  useEffect(() => {
    if (formData.state) {
      setLoadingCities(true);
      setCities([]); // Limpa as cidades anteriores
      fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${formData.state}/municipios`)
        .then(res => res.json())
        .then((data: City[]) => {
          setCities(data);
          setLoadingCities(false);
        })
        .catch(() => {
          setLoadingCities(false);
          toast.error('Erro ao carregar cidades');
        });
    }
  }, [formData.state]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    if (id === 'phone') {
      // Formatação do telefone: (XX) XXXXX-XXXX
      const cleaned = value.replace(/\D/g, '');
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
      
      setFormData(prev => ({ ...prev, [id]: formatted }));
    } else {
      setFormData(prev => ({ ...prev, [id]: value }));
    }
  };

  const handleSelectChange = (field: 'state' | 'city', value: string) => {
    const updatedData = { ...formData, [field]: value };
    if (field === 'state') {
      updatedData.city = '';
    }
    setFormData(updatedData);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações
    if (!privacyChecked || !privacyAccepted) {
      setError('É necessário aceitar a Política de Privacidade para se cadastrar.');
      toast.error('É necessário aceitar a Política de Privacidade para se cadastrar.');
      return;
    }
    if (formData.password !== confirmPassword) {
      setError('As senhas não coincidem');
      toast.error('As senhas não coincidem');
      return;
    }
    if (!formData.password || formData.password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres');
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    setIsLoading(true);
    setError('');
    
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
        }
      });

      if (error) {
        setError(error.message);
        toast.error(error.message);
        return;
      }

      if (data.user) {
        toast.success('Cadastro realizado com sucesso!');
        setShowTeamSelection(true);
      }
    } catch (err) {
      setError('Ocorreu um erro ao tentar se cadastrar.');
      toast.error('Erro de conexão durante o cadastro');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    if (!privacyChecked || !privacyAccepted) {
      toast.error('É necessário aceitar a Política de Privacidade para se cadastrar.');
      return;
    }
    
    setGoogleLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/register`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) {
        console.error('Google OAuth error:', error);
        
        if (error.message.includes('provider is not enabled') || error.message.includes('Unsupported provider')) {
          toast.error('Cadastro com Google não está configurado. Entre em contato com o administrador.', {
            duration: 5000,
          });
        } else {
          toast.error(error.message);
        }
        setGoogleLoading(false);
      }
    } catch (error) {
      console.error('Google signup error:', error);
      toast.error("Erro ao cadastrar com Google. Tente novamente mais tarde.");
      setGoogleLoading(false);
    }
  };

  const handleFacebookSignup = async () => {
    if (!privacyChecked || !privacyAccepted) {
      toast.error('É necessário aceitar a Política de Privacidade para se cadastrar.');
      return;
    }
    
    setFacebookLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'facebook',
        options: {
          redirectTo: `${window.location.origin}/register`,
          scopes: 'email,public_profile',
        },
      });

      if (error) {
        console.error('Facebook OAuth error:', error);
        
        if (error.message.includes('provider is not enabled') || error.message.includes('Unsupported provider')) {
          toast.error('Cadastro com Facebook não está configurado. Entre em contato com o administrador.', {
            duration: 5000,
          });
        } else {
          toast.error(error.message);
        }
        setFacebookLoading(false);
      }
    } catch (error) {
      console.error('Facebook signup error:', error);
      toast.error("Erro ao cadastrar com Facebook. Tente novamente mais tarde.");
      setFacebookLoading(false);
    }
  };

  const registerForm = useMemo(() => (
    <form onSubmit={handleRegister} className="space-y-3 lg:space-y-4">
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
      
      <div className="flex flex-col sm:grid sm:grid-cols-2 gap-4">
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            id="password" 
            type={showPassword ? 'text' : 'password'} 
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
            {showPassword ? <EyeOff className="h-3 w-3"/> : <Eye className="h-3 w-3"/>}
          </Button>
        </div>
        
        <div className="relative">
          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            id="confirmPassword" 
            type={showPassword ? 'text' : 'password'} 
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
              <div className={`w-3 h-3 rounded-full flex items-center justify-center transition-all ${
                isPasswordValid ? 'bg-green-500 shadow-sm' : 'bg-red-500'
              }`}>
                {isPasswordValid && <span className="text-white text-[10px]">✓</span>}
              </div>
              <span className={`font-medium transition-colors ${
                isPasswordValid ? 'text-green-700 dark:text-green-400' : 'text-red-500'
              }`}>
                Mínimo 6 caracteres
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <div className={`w-3 h-3 rounded-full flex items-center justify-center transition-all ${
                passwordsMatch && confirmPassword ? 'bg-green-500 shadow-sm' : 'bg-red-500'
              }`}>
                {passwordsMatch && confirmPassword && <span className="text-white text-[10px]">✓</span>}
              </div>
              <span className={`font-medium transition-colors ${
                passwordsMatch && confirmPassword ? 'text-green-700 dark:text-green-400' : 'text-red-500'
              }`}>
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
      
      <div className="flex flex-col sm:grid sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="state" className="text-muted-foreground text-xs">Estado</Label>
          <Select value={formData.state} onValueChange={(value) => handleSelectChange('state', value)} disabled={loadingStates}>
            <SelectTrigger className="h-10 lg:h-11 disabled:opacity-50 disabled:cursor-wait">
              <SelectValue placeholder={loadingStates ? 'Carregando estados...' : 'Selecione o estado'} />
            </SelectTrigger>
            <SelectContent className="bg-background border border-border shadow-lg max-h-[200px]">
              {states.map(state => (
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
          <Label htmlFor="city" className="text-muted-foreground text-xs">Cidade</Label>
          <Select value={formData.city} onValueChange={(value) => handleSelectChange('city', value)} disabled={!formData.state || loadingCities}>
            <SelectTrigger className="h-10 lg:h-11 disabled:opacity-50 disabled:cursor-wait">
              <SelectValue placeholder={
                !formData.state 
                  ? 'Primeiro selecione o estado' 
                  : loadingCities 
                    ? 'Carregando cidades...' 
                    : 'Selecione a cidade'
              } />
            </SelectTrigger>
            <SelectContent className="bg-background border border-border shadow-lg max-h-[200px]">
              {cities.map(city => (
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
          <button type="button" className="underline text-primary hover:text-secondary transition-colors" onClick={() => setPrivacyModalOpen(true)}>
            Política de Privacidade
          </button>
        </Label>
      </div>
      
      {error && <p className="text-sm text-destructive text-center">{error}</p>}
      
      <Button 
        type="submit" 
        className="w-full h-10 lg:h-11 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-medium rounded-xl transition-all duration-300 transform hover:scale-[1.02]"
        disabled={
          isLoading ||
          !formData.name ||
          !formData.email ||
          !formData.password ||
          !confirmPassword ||
          !privacyChecked ||
          !privacyAccepted
        }
      >
        {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : 'CRIAR CONTA'}
      </Button>

      <div className="relative my-4">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/30"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="bg-card px-4 text-muted-foreground">ou cadastre-se com</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Button 
          variant="outline"
          onClick={handleGoogleSignup}
          type="button"
          disabled={googleLoading || isLoading || !privacyChecked || !privacyAccepted}
          className="h-10 lg:h-11 border-border/50 hover:bg-primary/5 hover:border-primary/30 hover:text-primary transition-all duration-200"
        >
          {googleLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Chrome className="w-4 h-4 mr-2" />
              Google
            </>
          )}
        </Button>
        <Button 
          variant="outline"
          type="button"
          onClick={handleFacebookSignup}
          disabled={facebookLoading || isLoading || !privacyChecked || !privacyAccepted}
          className="h-10 lg:h-11 border-border/50 hover:bg-secondary/5 hover:border-secondary/30 hover:text-secondary transition-all duration-200"
        >
          {facebookLoading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <>
              <Facebook className="w-4 h-4 mr-2" />
              Facebook
            </>
          )}
        </Button>
      </div>
      
      <div className="text-center">
        <span className="text-muted-foreground text-sm">Já tem uma conta? </span>
        <a 
          href="/login" 
          className="text-primary hover:text-primary/80 font-medium text-sm transition-colors"
        >
          Conecte-se
        </a>
      </div>
    </form>
  ), [formData, confirmPassword, showPassword, error, isLoading, googleLoading, facebookLoading, privacyChecked, privacyAccepted, states, cities, loadingStates, loadingCities, passwordsMatch, isPasswordValid, handleRegister, handleInputChange, handleSelectChange, handleGoogleSignup, handleFacebookSignup, setPrivacyModalOpen]);

  return (
    <>
      <div className="min-h-screen bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 flex relative">
        {/* Background gradient for entire screen */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-accent/10 via-secondary/15 to-primary/5"></div>
        <div className="absolute inset-0 bg-gradient-to-tl from-secondary/10 via-transparent to-accent/15 opacity-70"></div>
        
        {/* Left side - Showcase */}
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
                Transforme Ideias em Conteúdo
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Junte-se à nossa comunidade e comece a criar posts incríveis com o poder da inteligência artificial.
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-card/30 backdrop-blur-sm rounded-xl border border-primary/20">
                <div className="w-3 h-3 bg-primary rounded-full"></div>
                <div>
                  <h3 className="font-semibold text-foreground text-base">IA Avançada</h3>
                  <p className="text-muted-foreground text-sm">Criação de conteúdo inteligente e personalizado</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 bg-card/30 backdrop-blur-sm rounded-xl border border-secondary/20">
                <div className="w-3 h-3 bg-secondary rounded-full"></div>
                <div>
                  <h3 className="font-semibold text-foreground text-base">Rápido e Eficiente</h3>
                  <p className="text-muted-foreground text-sm">Acelere sua produção de conteúdo em até 10x</p>
                </div>
              </div>
              
              <div className="flex items-center gap-4 p-4 bg-card/30 backdrop-blur-sm rounded-xl border border-accent/20">
                <div className="w-3 h-3 bg-accent rounded-full"></div>
                <div>
                  <h3 className="font-semibold text-foreground text-base">Múltiplas Plataformas</h3>
                  <p className="text-muted-foreground text-sm">Conteúdo otimizado para todas as redes sociais</p>
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
                    Transforme ideias em impacto.
                  </h1>
                  <p className="text-base text-muted-foreground max-w-md mx-auto leading-relaxed">
                    Junte-se à nossa comunidade e comece a criar posts incríveis com o poder da inteligência artificial
                  </p>
                </div>
              </div>

              {/* Fixed buttons at bottom */}
              <div className="absolute bottom-8 left-0 right-0 px-8 space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full h-14 bg-card/90 backdrop-blur-xl border-2 font-semibold rounded-2xl text-lg"
                  onClick={() => navigate("/login")}
                >
                  Já tenho conta
                </Button>

                <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                  <SheetTrigger asChild>
                    <Button 
                      className="w-full h-14 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold rounded-2xl text-lg shadow-xl"
                    >
                      Criar conta
                    </Button>
                  </SheetTrigger>
                  <SheetContent 
                    side="bottom" 
                    className="h-[90vh] rounded-t-3xl p-0 border-t-2"
                  >
                    <div className="h-full overflow-y-auto p-6 pt-8">
                      <div className="flex items-center justify-between mb-6">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => setSheetOpen(false)}
                          className="rounded-full"
                        >
                          <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div className="w-12 h-1.5 bg-muted-foreground/20 rounded-full"></div>
                        <div className="w-10"></div>
                      </div>
                      
                      <div className="text-center mb-6">
                        <h2 className="text-2xl font-bold text-foreground mb-2">Crie sua Conta</h2>
                        <p className="text-muted-foreground text-sm">É rápido e fácil. Vamos começar!</p>
                      </div>

                      {registerForm}
                    </div>
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </div>
        ) : (
          /* Desktop version - Right side - Register form */
          <div className="w-full lg:w-1/2 flex items-center justify-center p-4 lg:p-6 relative min-h-screen lg:min-h-0">
            {/* Register card */}
            <div className="w-full max-w-md">
              <div className="bg-card/90 backdrop-blur-xl border border-border/50 rounded-2xl shadow-2xl p-4 lg:p-6">
                <div className="text-center mb-4 lg:mb-6">
                  <h2 className="text-xl lg:text-2xl font-bold text-foreground mb-2">Crie sua Conta</h2>
                  <p className="text-muted-foreground text-sm">É rápido e fácil. Vamos começar!</p>
                </div>

                {registerForm}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Modal de Política de Privacidade */}
      <Dialog open={privacyModalOpen} onOpenChange={setPrivacyModalOpen}>
        <DialogContent className="max-w-[100vw] md:max-w-lg w-full mx-0 md:mx-4 max-h-[100vh] md:max-h-[85vh] p-0 rounded-none md:rounded-lg border-0 md:border">
          <div className="flex flex-col h-[100vh] md:h-auto md:max-h-[85vh]">
            {/* Header fixo */}
            <DialogHeader className="flex-shrink-0 p-3 md:p-6 pb-2 md:pb-4 border-b bg-background">
              <DialogTitle className="text-sm md:text-lg font-bold leading-tight pr-8 text-foreground">
                Política de Privacidade – Uso de Dados e IA
              </DialogTitle>
            </DialogHeader>
            
            {/* Conteúdo com scroll */}
            <div className="flex-1 overflow-y-auto p-3 md:p-6 pt-2 md:pt-4">
              <div className="space-y-2 md:space-y-4 text-xs md:text-sm text-muted-foreground">
                <p className="font-medium text-foreground text-xs md:text-sm">
                  👋 Olá! Antes de usar nossa plataforma, é importante que você saiba como cuidamos dos seus dados:
                </p>
                <ul className="list-disc pl-3 md:pl-5 space-y-1.5 md:space-y-3">
                  <li className="leading-relaxed text-xs md:text-sm">
                    <span className="font-semibold text-foreground">O que coletamos:</span> informações de cadastro (nome, e-mail, telefone), dados de navegação, histórico de uso e, quando necessário, informações de pagamento.
                  </li>
                  <li className="leading-relaxed text-xs md:text-sm">
                    <span className="font-semibold text-foreground">Como usamos:</span> para oferecer e melhorar os serviços, personalizar sua experiência, enviar novidades e cumprir obrigações legais.
                  </li>
                  <li className="leading-relaxed text-xs md:text-sm">
                    <span className="font-semibold text-foreground">Inteligência Artificial:</span> usamos IA para recomendar conteúdos, apoiar no suporte e ajudar na criação de materiais. Mas sempre com transparência e sem usar dados sensíveis sem sua permissão.
                  </li>
                  <li className="leading-relaxed text-xs md:text-sm">
                    <span className="font-semibold text-foreground">Compartilhamento:</span> nunca vendemos seus dados. Só compartilhamos com parceiros essenciais para o funcionamento da plataforma ou quando a lei exigir.
                  </li>
                  <li className="leading-relaxed text-xs md:text-sm">
                    <span className="font-semibold text-foreground">Seus direitos:</span> você pode pedir acesso, correção, exclusão ou portabilidade dos seus dados, além de cancelar comunicações de marketing a qualquer momento.
                  </li>
                  <li className="leading-relaxed text-xs md:text-sm">
                    <span className="font-semibold text-foreground">Segurança:</span> seus dados ficam protegidos com medidas avançadas de segurança e só são armazenados pelo tempo necessário.
                  </li>
                </ul>
                <div className="pt-1 md:pt-3">
                  <p className="font-medium text-foreground text-xs md:text-sm">
                    📌 Ao continuar, você concorda com nossa{' '}
                    <button type="button" className="underline text-primary hover:text-secondary transition-colors font-semibold">
                      Política de Privacidade completa
                    </button>.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Footer fixo */}
            <DialogFooter className="flex-shrink-0 p-3 md:p-6 pt-2 md:pt-4 border-t bg-background">
              <div className="flex flex-col-reverse md:flex-row gap-2 md:gap-2 w-full">
                <Button
                  variant="outline"
                  type="button"
                  className="w-full md:w-auto md:min-w-[120px] h-11 md:h-10 text-xs md:text-sm font-medium"
                  onClick={() => {
                    setPrivacyModalOpen(false);
                    setPrivacyChecked(false);
                    setPrivacyAccepted(false);
                  }}
                >
                  Não aceito
                </Button>
                <Button
                  type="button"
                  className="w-full md:w-auto md:min-w-[120px] h-11 md:h-10 bg-gradient-to-r from-primary to-secondary font-bold text-xs md:text-sm"
                  onClick={() => {
                    setPrivacyModalOpen(false);
                    setPrivacyChecked(true);
                    setPrivacyAccepted(true);
                  }}
                >
                  Aceito e concordo
                </Button>
              </div>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Team Selection Dialog */}
      <TeamSelectionDialog
        open={showTeamSelection || oauthTeamDialog}
        onClose={() => {
          setShowTeamSelection(false);
          if (oauthTeamDialog) {
            handleOAuthTeamDialogClose();
          } else {
            navigate("/");
          }
        }}
      />
    </>
  );
};

export default Register;