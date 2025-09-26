import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { CreatorLogo } from "@/components/CreatorLogo";
import { Eye, EyeOff, User, Mail, Phone, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
      // Simulate registration - in real app would create account
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success('Cadastro realizado com sucesso!');
      navigate("/dashboard");
    } catch (err) {
      setError('Ocorreu um erro ao tentar se cadastrar.');
      toast.error('Erro de conexão durante o cadastro');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="w-full min-h-screen lg:grid lg:grid-cols-2">
        {/* Header mobile com logo e texto */}
        <div className="lg:hidden bg-gradient-to-br from-primary to-secondary text-white p-6 text-center">
          <CreatorLogo className="mx-auto mb-4 w-32" />
          <h2 className="text-xl font-bold">Junte-se a nós!</h2>
          <p className="mt-2 text-white/80 text-sm">Crie sua conta e comece a transformar ideias em conteúdo.</p>
        </div>

        {/* Coluna Esquerda: Formulário de Cadastro */}
        <div className="flex items-center justify-center p-6 lg:p-8 bg-background overflow-y-auto">
          <div className="w-full max-w-md space-y-5 lg:space-y-6">
            <div className="text-center hidden lg:block">
              <h1 className="text-3xl font-bold text-foreground">Crie sua Conta</h1>
              <p className="text-muted-foreground mt-2">
                É rápido e fácil. Vamos começar!
              </p>
            </div>

            {/* Título mobile mais compacto */}
            <div className="text-center lg:hidden">
              <h1 className="text-2xl font-bold text-foreground mb-2">Crie sua Conta</h1>
              <p className="text-muted-foreground text-sm">
                É rápido e fácil. Vamos começar!
              </p>
            </div>

            <form onSubmit={handleRegister} className="space-y-4 lg:space-y-5">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                  id="name" 
                  placeholder="Nome Completo" 
                  required 
                  value={formData.name} 
                  onChange={handleInputChange} 
                  className="pl-10 h-12" 
                />
              </div>
              
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="E-mail" 
                  required 
                  value={formData.email} 
                  onChange={handleInputChange} 
                  className="pl-10 h-12" 
                />
              </div>
              
              {/* Campos de senha lado a lado no desktop, empilhados no mobile */}
              <div className="flex flex-col sm:grid sm:grid-cols-2 gap-4">
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input 
                    id="password" 
                    type={showPassword ? 'text' : 'password'} 
                    placeholder="Senha" 
                    required 
                    minLength={6} 
                    value={formData.password} 
                    onChange={handleInputChange} 
                    className="pl-10 pr-12 h-12" 
                  />
                  <Button 
                    type="button"
                    variant="ghost" 
                    size="icon" 
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8" 
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                  </Button>
                </div>
                
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input 
                    id="confirmPassword" 
                    type={showPassword ? 'text' : 'password'} 
                    placeholder="Confirmar Senha" 
                    required 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                    className="pl-10 h-12" 
                  />
                </div>
              </div>
              
              {/* Indicadores de validação da senha */}
              {formData.password && (
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded-lg border border-green-200/50 shadow-md">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
                    <div className="flex items-center gap-2 text-sm">
                      <div className={`w-3 h-3 rounded-full flex items-center justify-center transition-all ${
                        isPasswordValid ? 'bg-green-500 shadow-sm' : 'bg-red-500'
                      }`}>
                        {isPasswordValid && <span className="text-white text-[10px]">✓</span>}
                      </div>
                      <span className={`font-medium transition-colors ${
                        isPasswordValid ? 'text-green-700' : 'text-red-500'
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
                        passwordsMatch && confirmPassword ? 'text-green-700' : 'text-red-500'
                      }`}>
                        Senhas coincidem
                      </span>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                  id="phone" 
                  type="tel" 
                  placeholder="(XX) XXXXX-XXXX" 
                  value={formData.phone} 
                  onChange={handleInputChange} 
                  className="pl-10 h-12" 
                  maxLength={15} 
                />
              </div>
              
              <div className="flex flex-col sm:grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="state" className="text-muted-foreground text-xs">Estado</Label>
                  <Select value={formData.state} onValueChange={(value) => handleSelectChange('state', value)} disabled={loadingStates}>
                    <SelectTrigger className="h-12">
                      {loadingStates ? 'Carregando...' : <SelectValue placeholder="Selecione" />}
                    </SelectTrigger>
                    <SelectContent>
                      {states.map(state => (
                        <SelectItem key={state.id} value={state.sigla}>{state.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="city" className="text-muted-foreground text-xs">Cidade</Label>
                  <Select value={formData.city} onValueChange={(value) => handleSelectChange('city', value)} disabled={!formData.state || loadingCities}>
                    <SelectTrigger className="h-12">
                      {loadingCities ? 'Carregando...' : <SelectValue placeholder="Selecione" />}
                    </SelectTrigger>
                    <SelectContent>
                      {cities.map(city => (
                        <SelectItem key={city.id} value={city.nome}>{city.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              {/* Checkbox de política de privacidade */}
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
                className="w-full rounded-lg text-base py-4 lg:py-5 bg-gradient-to-r from-primary to-secondary font-bold tracking-wider"
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
                {isLoading ? <Loader2 className="animate-spin" /> : 'CRIAR CONTA'}
              </Button>
            </form>
            
            <div className="text-center text-sm">
              <span className="text-muted-foreground">Já tem uma conta? </span>
              <a 
                href="/login" 
                className="font-semibold text-primary hover:underline"
              >
                Conecte-se
              </a>
            </div>
          </div>
        </div>
        
        {/* Coluna Direita: Showcase */}
        <div className="hidden lg:flex flex-col items-center justify-center p-12 bg-gradient-to-br from-primary to-secondary text-white text-center">
          <div className="max-w-md space-y-4">
            <CreatorLogo className="mx-auto w-48" />
            <h2 className="text-4xl font-bold mt-6">Transforme Ideias em Conteúdo</h2>
            <p className="mt-4 text-white/80 text-lg">
              Junte-se à nossa comunidade e comece a criar posts incríveis com o poder da inteligência artificial.
            </p>
          </div>
        </div>
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
    </>
  );
};

export default Register;