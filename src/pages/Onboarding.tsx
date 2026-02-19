import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreatorLogo } from "@/components/CreatorLogo";
import { 
  Eye, EyeOff, User, Mail, Phone, Lock, Loader2, CheckCircle, 
  ArrowLeft, ArrowRight, Zap, Crown, Rocket, Sparkles, Star, Gift, Shield, Clock, MessageCircle, Plus, Minus, ShoppingCart
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { getEmailRedirectUrl } from "@/lib/auth-urls";
import { useExtensionProtection, useFormProtection } from "@/hooks/useExtensionProtection";
import { motion, AnimatePresence } from "framer-motion";

interface State {
  id: number;
  sigla: string;
  nome: string;
}

interface City {
  id: number;
  nome: string;
}

interface CreditPackage {
  id: string;
  name: string;
  description: string;
  price: number;
  credits: number;
  stripePriceId: string | null;
  isEnterprise?: boolean;
}

type Step = 'packages' | 'auth' | 'checkout';
type AuthMode = 'login' | 'register';

const packageIcons: Record<string, any> = {
  pack_trial: Rocket,
  pack_basic: Zap,
  pack_pro: Crown,
  pack_premium: Sparkles,
  pack_enterprise: Star,
};

const packageColors: Record<string, string> = {
  pack_trial: "from-slate-500 to-slate-600",
  pack_basic: "from-blue-500 to-blue-600",
  pack_pro: "from-purple-500 to-purple-600",
  pack_premium: "from-pink-500 to-pink-600",
  pack_enterprise: "from-amber-500 to-orange-600",
};

const ENTERPRISE_WHATSAPP = "5581996600072";

const CREDIT_PRICE = 2.5; // R$ 2,50 por crédito
const CREDIT_STEP = 5; // Incremento de 5 em 5
const MIN_CREDITS = 5;
const MAX_CREDITS = 500;

const Onboarding = () => {
  const navigate = useNavigate();
  const { reloadUserData } = useAuth();
  
  useExtensionProtection();
  const formRef = useRef<HTMLFormElement>(null);
  useFormProtection(formRef);
  
  const [currentStep, setCurrentStep] = useState<Step>('packages');
  const [authMode, setAuthMode] = useState<AuthMode>('register');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [customCredits, setCustomCredits] = useState(20);
  const [isCustomSelected, setIsCustomSelected] = useState(false);
  const [loadingPackages, setLoadingPackages] = useState(true);
  
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

  const passwordsMatch = formData.password === confirmPassword;
  const isPasswordValid = formData.password && formData.password.length >= 6;

  // Load credit packages
  const loadPackages = useCallback(async () => {
    try {
      const { data: packagesData, error } = await supabase
        .from("plans")
        .select("*")
        .eq("is_active", true)
        .order("price_monthly", { ascending: true });

      if (error) throw error;

      if (packagesData) {
        const formattedPackages: CreditPackage[] = packagesData
          .filter((p) => p.id !== 'pack_trial' && p.id !== 'starter' && p.id !== 'free' && p.id !== 'pack_business')
          .map((p) => ({
            id: p.id,
            name: p.name,
            description: p.description || '',
            price: p.price_monthly || 0,
            credits: p.credits || 0,
            stripePriceId: p.stripe_price_id_monthly,
            isEnterprise: p.id === 'pack_enterprise',
          }));
        
        // Sort by price
        const sortedPackages = formattedPackages.sort((a, b) => a.price - b.price);
        
        setPackages(sortedPackages);
      }
    } catch (error) {
      console.error("Error loading packages:", error);
      toast.error("Erro ao carregar pacotes");
    } finally {
      setLoadingPackages(false);
    }
  }, []);

  useEffect(() => {
    loadPackages();
  }, [loadPackages]);

  useEffect(() => {
    fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome")
      .then((res) => res.json())
      .then((data: State[]) => {
        setStates(data);
        setLoadingStates(false);
      })
      .catch(() => {
        setLoadingStates(false);
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

  const handlePackageSelect = (pkg: CreditPackage) => {
    // Enterprise package - open WhatsApp
    if (pkg.isEnterprise) {
      const message = encodeURIComponent("Olá! Tenho interesse no pacote Enterprise do Creator. Gostaria de mais informações.");
      window.open(`https://wa.me/${ENTERPRISE_WHATSAPP}?text=${message}`, '_blank');
      return;
    }
    
    setIsCustomSelected(false);
    setSelectedPackage(pkg);
    setCurrentStep('auth');
  };

  const handleCustomSelect = () => {
    setIsCustomSelected(true);
    setSelectedPackage(null);
    setCurrentStep('auth');
  };

  const incrementCredits = () => {
    setCustomCredits(prev => Math.min(prev + CREDIT_STEP, MAX_CREDITS));
  };

  const decrementCredits = () => {
    setCustomCredits(prev => Math.max(prev - CREDIT_STEP, MIN_CREDITS));
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Usuário não encontrado");

      await reloadUserData();

      // If custom selected, proceed to checkout
      if (isCustomSelected) {
        await initiateCheckout(authData.user.id);
        return;
      }

      // If no package selected or free, just go to dashboard
      if (!selectedPackage || selectedPackage.price === 0) {
        toast.success("Bem-vindo de volta!");
        navigate('/dashboard');
        return;
      }

      // Otherwise, proceed to checkout
      await initiateCheckout(authData.user.id);
    } catch (error: any) {
      console.error('Erro no login:', error);
      toast.error('Erro ao fazer login', {
        description: error.message || 'Verifique suas credenciais e tente novamente.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.password || !formData.phone) {
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
      const redirectUrl = getEmailRedirectUrl('/dashboard');
      
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
        await reloadUserData();

        // Se selecionou pacote pago, vai para checkout
        if (isCustomSelected) {
          await initiateCheckout(data.user.id);
          return;
        }

        if (selectedPackage && selectedPackage.price > 0) {
          await initiateCheckout(data.user.id);
          return;
        }

        // Sem pacote ou gratuito: redirecionar para cadastro de cartão
        try {
          const { data: setupData, error: setupError } = await supabase.functions.invoke('setup-card', {
            body: { return_url: '/dashboard' }
          });

          if (!setupError && setupData?.url) {
            window.location.href = setupData.url;
            return;
          }
        } catch (cardError) {
          console.error('Erro ao configurar cartão:', cardError);
        }

        toast.success("Conta criada com sucesso! Bem-vindo ao Creator!");
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error("Erro no cadastro:", error);
      toast.error(error.message || "Erro ao criar conta");
    } finally {
      setIsLoading(false);
    }
  };

  const initiateCheckout = async (userId: string) => {
    setCurrentStep('checkout');

    try {
      let checkoutBody: any;
      
      if (isCustomSelected) {
        // Compra avulsa
        checkoutBody = {
          type: 'custom',
          credits: customCredits,
          return_url: '/credits'
        };
      } else if (selectedPackage && selectedPackage.stripePriceId) {
        // Compra de pacote
        checkoutBody = {
          type: 'credits',
          price_id: selectedPackage.stripePriceId,
          package_id: selectedPackage.id,
          return_url: '/credits'
        };
      } else {
        toast.error("Selecione um pacote ou quantidade de créditos");
        setCurrentStep('auth');
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: checkoutBody
      });

      if (error) throw error;

      if (!data?.url) {
        throw new Error("URL de checkout não retornada");
      }

      // Redireciona na mesma aba para o Stripe
      window.location.href = data.url;
    } catch (error: any) {
      console.error("Erro ao processar pagamento:", error);
      toast.error(error.message || "Erro ao processar pagamento");
      setCurrentStep('auth');
    }
  };

  const renderPackageCard = (pkg: CreditPackage, isPopular: boolean = false) => {
    const Icon = packageIcons[pkg.id] || Zap;
    const isSelected = selectedPackage?.id === pkg.id;
    const isEnterprise = pkg.isEnterprise;
    const colorClass = packageColors[pkg.id] || "from-blue-500 to-blue-600";

    return (
      <motion.div
        key={pkg.id}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        whileHover={{ scale: 1.02, y: -4 }}
        className="h-full"
      >
        <Card
          className={cn(
            "relative h-full cursor-pointer transition-all duration-300 overflow-hidden group",
            "border-2 hover:shadow-2xl",
            isSelected ? "border-primary ring-2 ring-primary/20 shadow-xl" : "border-border hover:border-primary/50",
            isPopular && "ring-2 ring-primary/30",
            isEnterprise && "border-amber-500/50"
          )}
          onClick={() => handlePackageSelect(pkg)}
        >
          {/* Gradient overlay */}
          <div className={cn(
            "absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500",
            "bg-gradient-to-br from-primary/5 via-transparent to-primary/10"
          )} />

          {isPopular && (
            <div className="absolute -right-8 top-6 rotate-45 bg-primary px-10 py-1 text-xs font-semibold text-primary-foreground shadow-lg">
              Popular
            </div>
          )}

          {isEnterprise && (
            <div className="absolute -right-8 top-6 rotate-45 bg-amber-500 px-10 py-1 text-xs font-semibold text-white shadow-lg">
              Sob consulta
            </div>
          )}

          {isSelected && !isEnterprise && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute top-4 right-4 bg-primary rounded-full p-1"
            >
              <CheckCircle className="h-5 w-5 text-primary-foreground" />
            </motion.div>
          )}

          <CardHeader className="relative pb-2">
            <div className={cn(
              "w-14 h-14 rounded-2xl flex items-center justify-center mb-4 transition-all duration-300",
              "bg-gradient-to-br shadow-lg",
              colorClass
            )}>
              <Icon className="h-7 w-7 text-white" />
            </div>
            
            <CardTitle className="text-2xl font-bold">{pkg.name}</CardTitle>
            <CardDescription className="text-sm min-h-[2.5rem]">{pkg.description}</CardDescription>
            
            <div className="mt-4 flex items-baseline gap-1">
              {isEnterprise ? (
                <span className="text-2xl font-bold text-amber-600">Entre em contato</span>
              ) : (
                <>
                  <span className="text-4xl font-bold">R$ {pkg.price.toLocaleString('pt-BR')}</span>
                </>
              )}
            </div>
          </CardHeader>

          <CardContent className="relative space-y-4">
            {/* Credits highlight */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
              <Zap className="h-6 w-6 text-primary flex-shrink-0" />
              <div>
                <span className="text-2xl font-bold text-primary">
                  {isEnterprise ? '∞' : pkg.credits.toLocaleString('pt-BR')}
                </span>
                <span className="text-sm text-muted-foreground ml-1">créditos</span>
              </div>
            </div>

            <Button
              className={cn(
                "w-full mt-4 transition-all duration-300",
                isEnterprise 
                  ? "bg-amber-500 hover:bg-amber-600 text-white" 
                  : isSelected 
                    ? "bg-primary" 
                    : "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground"
              )}
              size="lg"
            >
              {isEnterprise ? (
                <>
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Falar no WhatsApp
                </>
              ) : isSelected ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Selecionado
                </>
              ) : (
                <>
                  Comprar créditos
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    );
  };

  const renderPackagesStep = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="w-full max-w-5xl mx-auto space-y-8"
    >
      {/* Header */}
      <div className="text-center space-y-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Badge variant="secondary" className="px-4 py-1.5 text-sm font-medium">
            <Gift className="mr-2 h-4 w-4" />
            Compre créditos quando precisar
          </Badge>
        </motion.div>
        
        <motion.h1
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-4xl md:text-5xl font-bold tracking-tight"
        >
          Pacotes de Créditos
        </motion.h1>
        
        <motion.p
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-lg text-muted-foreground max-w-2xl mx-auto"
        >
          Compre créditos para usar nas ferramentas de criação, revisão e planejamento de conteúdo com IA.
        </motion.p>
      </div>

      {/* Benefits bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex flex-wrap justify-center gap-6 text-sm text-muted-foreground"
      >
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          <span>Pagamento seguro</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-primary" />
          <span>Créditos não expiram</span>
        </div>
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <span>Acesso imediato</span>
        </div>
      </motion.div>

      {/* Packages grid */}
      {loadingPackages ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {packages.map((pkg) => renderPackageCard(pkg, pkg.id === 'pack_pro'))}
          </div>

          {/* Compra Avulsa */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="mt-10"
          >
            <Card className="relative overflow-hidden border-2 border-dashed border-primary/30 hover:border-primary/50 transition-all duration-300">
              <div className="h-2 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
              
              <CardContent className="pt-8 pb-8">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
                  {/* Info */}
                  <div className="flex-1 text-center lg:text-left">
                    <div className="flex items-center gap-2 justify-center lg:justify-start mb-3">
                      <ShoppingCart className="h-6 w-6 text-primary" />
                      <h3 className="text-2xl font-bold">Compra Avulsa</h3>
                    </div>
                    <p className="text-muted-foreground mb-4">
                      Compre créditos avulsos de 5 em 5. Cada crédito custa <span className="font-semibold text-primary">R$ {CREDIT_PRICE.toFixed(2)}</span>
                    </p>
                    <div className="flex items-center justify-center lg:justify-start gap-2 text-sm text-muted-foreground">
                      <Zap className="h-4 w-4 text-primary" />
                      <span>Pagamento único via Stripe</span>
                    </div>
                  </div>

                  {/* Seletor de quantidade */}
                  <div className="flex flex-col items-center gap-4">
                    <div className="flex items-center gap-4">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-12 w-12 rounded-full border-2 hover:bg-primary hover:text-primary-foreground transition-all"
                        onClick={decrementCredits}
                        disabled={customCredits <= MIN_CREDITS}
                      >
                        <Minus className="h-5 w-5" />
                      </Button>
                      
                      <div className="text-center min-w-[140px]">
                        <motion.div 
                          key={customCredits}
                          initial={{ scale: 1.2, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="text-5xl font-bold text-primary"
                        >
                          {customCredits}
                        </motion.div>
                        <p className="text-sm text-muted-foreground">créditos</p>
                      </div>
                      
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-12 w-12 rounded-full border-2 hover:bg-primary hover:text-primary-foreground transition-all"
                        onClick={incrementCredits}
                        disabled={customCredits >= MAX_CREDITS}
                      >
                        <Plus className="h-5 w-5" />
                      </Button>
                    </div>

                    {/* Preço total */}
                    <motion.div 
                      key={customCredits * CREDIT_PRICE}
                      initial={{ scale: 1.1 }}
                      animate={{ scale: 1 }}
                      className="bg-primary/10 px-6 py-3 rounded-xl border border-primary/20"
                    >
                      <p className="text-sm text-muted-foreground text-center">Total</p>
                      <p className="text-3xl font-bold text-primary">
                        R$ {(customCredits * CREDIT_PRICE).toFixed(2)}
                      </p>
                    </motion.div>

                    {/* Botão de compra */}
                    <Button
                      onClick={handleCustomSelect}
                      size="lg"
                      className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <ShoppingCart className="h-5 w-5 mr-2" />
                      Comprar {customCredits} Créditos
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </motion.div>
  );

  const renderAuthStep = () => (
    <motion.div
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      className="w-full max-w-lg mx-auto"
    >
      <Card className="border-2 shadow-2xl overflow-hidden">
        {/* Package/Custom summary header */}
        {(selectedPackage || isCustomSelected) && (
          <div className={cn(
            "px-6 py-4 flex items-center justify-between",
            "bg-gradient-to-r from-primary/10 to-primary/5"
          )}>
            <div className="flex items-center gap-3">
              {isCustomSelected ? (
                <>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-primary/50 via-primary to-primary/50">
                    <ShoppingCart className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold">Compra Avulsa</p>
                    <p className="text-sm text-muted-foreground">
                      {customCredits} créditos • R$ {(customCredits * CREDIT_PRICE).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </>
              ) : selectedPackage && (
                <>
                  {(() => {
                    const Icon = packageIcons[selectedPackage.id] || Zap;
                    const colorClass = packageColors[selectedPackage.id] || "from-blue-500 to-blue-600";
                    return (
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center",
                        "bg-gradient-to-br",
                        colorClass
                      )}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                    );
                  })()}
                  <div>
                    <p className="font-semibold">{selectedPackage.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedPackage.credits.toLocaleString('pt-BR')} créditos • R$ {selectedPackage.price.toLocaleString('pt-BR')}
                    </p>
                  </div>
                </>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentStep('packages')}
              className="text-sm"
            >
              Trocar
            </Button>
          </div>
        )}

        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl">
            {authMode === 'register' ? 'Criar sua conta' : 'Entrar na sua conta'}
          </CardTitle>
          <CardDescription>
            {authMode === 'register' 
              ? 'Preencha seus dados para começar' 
              : 'Use suas credenciais para continuar'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Auth mode toggle */}
          <div className="flex mb-6 p-1 bg-muted rounded-lg">
            <Button
              type="button"
              variant={authMode === 'register' ? 'default' : 'ghost'}
              className="flex-1"
              onClick={() => setAuthMode('register')}
            >
              Criar conta
            </Button>
            <Button
              type="button"
              variant={authMode === 'login' ? 'default' : 'ghost'}
              className="flex-1"
              onClick={() => setAuthMode('login')}
            >
              Já tenho conta
            </Button>
          </div>

          <form ref={formRef} onSubmit={authMode === 'login' ? handleLogin : handleRegister} className="space-y-4">
            <AnimatePresence mode="wait">
              {authMode === 'register' && (
                <motion.div
                  key="register-fields"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome completo <span className="text-destructive">*</span></Label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="name" 
                        placeholder="Seu nome" 
                        className="pl-9" 
                        value={formData.name} 
                        onChange={handleInputChange} 
                        required 
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="seu@email.com" 
                  className="pl-9" 
                  value={formData.email} 
                  onChange={handleInputChange} 
                  required 
                />
              </div>
            </div>

            <AnimatePresence mode="wait">
              {authMode === 'register' && (
                <motion.div
                  key="phone-field"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-2"
                >
                  <Label htmlFor="phone">Telefone <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="phone" 
                      placeholder="(00) 00000-0000" 
                      className="pl-9" 
                      value={formData.phone} 
                      onChange={handleInputChange} 
                      required 
                      maxLength={15}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              <Label htmlFor="password">Senha <span className="text-destructive">*</span></Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input 
                  id="password" 
                  type={showPassword ? "text" : "password"} 
                  placeholder="••••••••" 
                  className="pl-9" 
                  value={formData.password} 
                  onChange={handleInputChange} 
                  required 
                />
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" 
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              {authMode === 'register' && formData.password && !isPasswordValid && (
                <p className="text-sm text-destructive">A senha deve ter pelo menos 6 caracteres</p>
              )}
            </div>

            <AnimatePresence mode="wait">
              {authMode === 'register' && (
                <motion.div
                  key="register-extra"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar senha <span className="text-destructive">*</span></Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="confirmPassword" 
                        type={showPassword ? "text" : "password"} 
                        placeholder="••••••••" 
                        className="pl-9" 
                        value={confirmPassword} 
                        onChange={(e) => setConfirmPassword(e.target.value)} 
                        required 
                      />
                    </div>
                    {confirmPassword && !passwordsMatch && (
                      <p className="text-sm text-destructive">As senhas não coincidem</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Estado</Label>
                      <Select 
                        value={formData.state} 
                        onValueChange={(value) => handleSelectChange("state", value)} 
                        disabled={loadingStates}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                          {states.map((state) => (
                            <SelectItem key={state.id} value={state.sigla}>{state.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Cidade</Label>
                      <Select 
                        value={formData.city} 
                        onValueChange={(value) => handleSelectChange("city", value)} 
                        disabled={!formData.state || loadingCities}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent className="max-h-[200px]">
                          {cities.map((city) => (
                            <SelectItem key={city.id} value={city.nome}>{city.nome}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-start space-x-2 pt-2">
                    <Checkbox 
                      id="privacy" 
                      checked={privacyChecked} 
                      onCheckedChange={() => setPrivacyModalOpen(true)} 
                    />
                    <label 
                      htmlFor="privacy" 
                      className="text-sm leading-tight cursor-pointer"
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
                </motion.div>
              )}
            </AnimatePresence>

            <Button 
              type="submit"
              disabled={isLoading || (authMode === 'register' && (!isPasswordValid || !passwordsMatch || !privacyChecked))} 
              className="w-full" 
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {authMode === 'register' ? 'Criando conta...' : 'Entrando...'}
                </>
              ) : (
                <>
                  Continuar para pagamento
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>

            {authMode === 'login' && (
              <div className="text-center">
                <Button
                  type="button"
                  variant="link"
                  onClick={() => navigate('/forgot-password')}
                  className="text-sm"
                >
                  Esqueci minha senha
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderCheckoutStep = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-center space-y-6"
    >
      <div className="w-20 h-20 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
      <div>
        <h2 className="text-2xl font-bold mb-2">Redirecionando para pagamento</h2>
        <p className="text-muted-foreground">Aguarde enquanto preparamos seu checkout seguro...</p>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 overflow-y-auto">
      {/* Background decoration */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative min-h-screen flex flex-col p-4 md:p-8">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => currentStep === 'auth' ? setCurrentStep('packages') : navigate('/')}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
          
          <CreatorLogo />

          <div className="w-20" /> {/* Spacer for centering */}
        </header>

        {/* Progress indicator */}
        <div className="max-w-md mx-auto w-full mb-8">
          <div className="flex items-center justify-between relative">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-muted -translate-y-1/2" />
            <div 
              className="absolute top-1/2 left-0 h-0.5 bg-primary -translate-y-1/2 transition-all duration-500"
              style={{ 
                width: currentStep === 'packages' ? '0%' : currentStep === 'auth' ? '50%' : '100%' 
              }}
            />
            
            {['packages', 'auth', 'checkout'].map((step, idx) => (
              <div key={step} className="relative z-10 flex flex-col items-center">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300",
                  currentStep === step || ['packages', 'auth', 'checkout'].indexOf(currentStep) >= idx
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted text-muted-foreground"
                )}>
                  {idx + 1}
                </div>
                <span className={cn(
                  "text-xs mt-1.5 font-medium",
                  currentStep === step ? "text-primary" : "text-muted-foreground"
                )}>
                  {step === 'packages' ? 'Pacote' : step === 'auth' ? 'Conta' : 'Pagamento'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <main className="flex-1 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {currentStep === 'packages' && renderPackagesStep()}
            {currentStep === 'auth' && renderAuthStep()}
            {currentStep === 'checkout' && renderCheckoutStep()}
          </AnimatePresence>
        </main>

        {/* Footer */}
        <footer className="text-center text-sm text-muted-foreground mt-8">
          <p>© 2024 Creator. Todos os direitos reservados.</p>
        </footer>
      </div>

      {/* Privacy Modal */}
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
  );
};

export default Onboarding;
