import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Check, Coins, Sparkles, Zap, Crown, Rocket, Building2, Star, Gift, MessageCircle, Plus, Minus, ShoppingCart } from "lucide-react";
import { TourSelector } from "@/components/onboarding/TourSelector";
import { creditsSteps, navbarSteps } from "@/components/onboarding/tourSteps";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { motion } from "framer-motion";

interface CreditPackage {
  id: string;
  name: string;
  description: string;
  price: number;
  credits: number;
  stripePriceId: string;
  icon: React.ReactNode;
  gradient: string;
  popular?: boolean;
}

const packageConfig: Record<string, { icon: React.ReactNode; gradient: string }> = {
  pack_trial: { 
    icon: <Gift className="h-8 w-8" />, 
    gradient: "from-emerald-500 to-teal-600" 
  },
  pack_basic: { 
    icon: <Zap className="h-8 w-8" />, 
    gradient: "from-blue-500 to-cyan-600" 
  },
  pack_pro: { 
    icon: <Rocket className="h-8 w-8" />, 
    gradient: "from-violet-500 to-purple-600" 
  },
  pack_premium: { 
    icon: <Crown className="h-8 w-8" />, 
    gradient: "from-amber-500 to-orange-600" 
  },
  pack_business: { 
    icon: <Star className="h-8 w-8" />, 
    gradient: "from-rose-500 to-pink-600" 
  },
  pack_enterprise: { 
    icon: <Building2 className="h-8 w-8" />, 
    gradient: "from-slate-600 to-slate-800" 
  },
};

const CREDIT_PRICE = 2; // R$ 2,00 por crédito
const CREDIT_STEP = 5; // Incremento de 5 em 5
const MIN_CREDITS = 5;
const MAX_CREDITS = 500;

const Credits = () => {
  const { user, refreshUserCredits } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loadingPackageId, setLoadingPackageId] = useState<string | null>(null);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [customCredits, setCustomCredits] = useState(20);
  const [loadingCustom, setLoadingCustom] = useState(false);

  useEffect(() => {
    loadPackages();
    handlePaymentCallback();
  }, [searchParams]);

  const legacyPlanIds = ['free', 'starter', 'pack_business'];

  const loadPackages = async () => {
    const { data } = await supabase
      .from('plans')
      .select('*')
      .eq('is_active', true)
      .order('price_monthly', { ascending: true });
    
    if (data) {
      const filteredPackages = data
        .filter(p => !legacyPlanIds.includes(p.id))
        .map(p => ({
          id: p.id,
          name: p.name,
          description: p.description || '',
          price: p.price_monthly,
          credits: p.credits,
          stripePriceId: p.stripe_price_id_monthly || '',
          icon: packageConfig[p.id]?.icon || <Coins className="h-8 w-8" />,
          gradient: packageConfig[p.id]?.gradient || "from-gray-500 to-gray-600",
          popular: p.id === 'pack_pro'
        }));
      setPackages(filteredPackages);
    }
  };

  const handlePaymentCallback = async () => {
    const success = searchParams.get('success');
    const sessionId = searchParams.get('session_id');

    if (success === 'true' && sessionId) {
      setVerifyingPayment(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const { data, error } = await supabase.functions.invoke('verify-payment', {
          body: { session_id: sessionId },
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          }
        });

        if (error) throw error;

        if (data.success) {
          await refreshUserCredits();
          
          toast.success(
            data.already_processed 
              ? "Pagamento já processado! Redirecionando..." 
              : `✅ ${data.credits_added} créditos adicionados! Novo saldo: ${data.new_balance} créditos`,
            { duration: 4000 }
          );
          
          // Redireciona para o dashboard após sucesso
          setTimeout(() => {
            navigate('/dashboard', { replace: true });
          }, 1500);
        } else {
          toast.error("Pagamento não foi concluído");
          navigate('/credits', { replace: true });
        }
      } catch (error: any) {
        console.error("Error verifying payment:", error);
        toast.error("Erro ao verificar pagamento: " + error.message);
      } finally {
        setVerifyingPayment(false);
      }
    } else if (searchParams.get('canceled') === 'true') {
      toast.info("Compra cancelada");
      navigate('/credits', { replace: true });
    }
  };

  const handleBuyPackage = async (pkg: CreditPackage) => {
    if (!user) return;
    
    // Enterprise redireciona para WhatsApp
    if (pkg.id === 'pack_enterprise') {
      window.open('https://wa.me/5581996600072?text=Olá! Tenho interesse no pacote Enterprise do Creator.', '_blank');
      return;
    }

    // Pacote gratuito/trial - apenas redireciona
    if (pkg.price === 0) {
      toast.success(`Você já tem ${user.credits || 0} créditos disponíveis!`);
      navigate('/dashboard');
      return;
    }
    
    setLoadingPackageId(pkg.id);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          type: 'credits',
          price_id: pkg.stripePriceId,
          package_id: pkg.id,
          return_url: '/credits'
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        }
      });

      if (error) throw error;
      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      console.error("Error creating checkout:", error);
      toast.error("Erro ao criar checkout: " + error.message);
    } finally {
      setLoadingPackageId(null);
    }
  };

  const handleCustomPurchase = async () => {
    if (!user) return;
    
    setLoadingCustom(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { 
          type: 'custom',
          credits: customCredits,
          return_url: '/credits'
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
        }
      });

      if (error) throw error;
      if (data.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      console.error("Error creating custom checkout:", error);
      toast.error("Erro ao criar checkout: " + error.message);
    } finally {
      setLoadingCustom(false);
    }
  };

  const incrementCredits = () => {
    setCustomCredits(prev => Math.min(prev + CREDIT_STEP, MAX_CREDITS));
  };

  const decrementCredits = () => {
    setCustomCredits(prev => Math.max(prev - CREDIT_STEP, MIN_CREDITS));
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.4
      }
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <PageBreadcrumb items={[{ label: "Comprar Créditos" }]} className="mb-6" />

      {verifyingPayment && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <Card className="w-auto">
            <CardContent className="pt-6 flex flex-col items-center gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-lg font-medium">Verificando pagamento...</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Header com saldo */}
      <motion.div 
        id="credits-balance" 
        className="mb-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <h1 className="text-4xl font-bold mb-4">Comprar Créditos</h1>
        <div className="inline-flex items-center gap-3 bg-primary/10 px-6 py-3 rounded-full border border-primary/20">
          <div className="p-2 bg-primary/20 rounded-full">
            <Coins className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Seu saldo atual</p>
            <p className="text-2xl font-bold text-primary">{user?.credits || 0} créditos</p>
          </div>
        </div>
      </motion.div>

      {/* Pacotes de Créditos */}
      <section className="mb-12">
        <div className="flex items-center gap-2 mb-8">
          <Sparkles className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Escolha seu Pacote</h2>
        </div>
        
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {packages.map((pkg) => (
            <motion.div key={pkg.id} variants={cardVariants}>
              <Card 
                className={`relative overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 ${
                  pkg.popular ? 'ring-2 ring-primary shadow-lg' : ''
                }`}
              >
                {/* Gradient header */}
                <div className={`h-2 bg-gradient-to-r ${pkg.gradient}`} />
                
                {pkg.popular && (
                  <div className="absolute top-4 right-4">
                    <Badge className="bg-primary text-primary-foreground animate-pulse">
                      Mais Popular
                    </Badge>
                  </div>
                )}

                <CardHeader className="pb-4">
                  <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${pkg.gradient} flex items-center justify-center text-white mb-4 shadow-lg`}>
                    {pkg.icon}
                  </div>
                  <CardTitle className="text-2xl">{pkg.name}</CardTitle>
                  <CardDescription className="text-base">
                    {pkg.credits} créditos para criar conteúdo
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                  {/* Preço */}
                  <div>
                    {pkg.id === 'pack_enterprise' ? (
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-bold text-foreground">Sob consulta</span>
                      </div>
                    ) : pkg.price === 0 ? (
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-primary">Grátis</span>
                      </div>
                    ) : (
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold">R$ {pkg.price.toFixed(0)}</span>
                        <span className="text-muted-foreground">/pacote</span>
                      </div>
                    )}
                    
                    {pkg.price > 0 && pkg.id !== 'pack_enterprise' && (
                      <p className="text-sm text-muted-foreground mt-1">
                        R$ {(pkg.price / pkg.credits).toFixed(2)} por crédito
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <ul className="space-y-2">
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" />
                      <span>{pkg.credits} créditos inclusos</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" />
                      <span>Sem validade</span>
                    </li>
                    <li className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-primary" />
                      <span>Acesso a todos os recursos</span>
                    </li>
                  </ul>

                  {/* Botão */}
                  <Button 
                    onClick={() => handleBuyPackage(pkg)}
                    disabled={loadingPackageId === pkg.id}
                    className={`w-full h-12 text-base font-semibold transition-all duration-300 ${
                      pkg.popular 
                        ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl' 
                        : pkg.id === 'pack_enterprise'
                        ? 'bg-secondary hover:bg-secondary/80 text-secondary-foreground'
                        : ''
                    }`}
                    variant={pkg.popular || pkg.id === 'pack_enterprise' ? 'default' : 'outline'}
                    size="lg"
                  >
                    {loadingPackageId === pkg.id ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : pkg.id === 'pack_enterprise' ? (
                      <>
                        <MessageCircle className="h-5 w-5 mr-2" />
                        Falar com Consultor
                      </>
                    ) : pkg.price === 0 ? (
                      <>
                        <Check className="h-5 w-5 mr-2" />
                        Já Incluído
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5 mr-2" />
                        Comprar Agora
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Compra Avulsa */}
      <motion.section 
        className="mb-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        <div className="flex items-center gap-2 mb-8">
          <ShoppingCart className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold">Compra Avulsa</h2>
        </div>

        <Card className="relative overflow-hidden border-2 border-dashed border-primary/30 hover:border-primary/50 transition-all duration-300">
          <div className="h-2 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
          
          <CardContent className="pt-8 pb-8">
            <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
              {/* Info */}
              <div className="flex-1 text-center lg:text-left">
                <h3 className="text-2xl font-bold mb-2">Escolha a quantidade exata</h3>
                <p className="text-muted-foreground mb-4">
                  Compre créditos avulsos de 5 em 5. Cada crédito custa <span className="font-semibold text-primary">R$ {CREDIT_PRICE.toFixed(2)}</span>
                </p>
                <div className="flex items-center justify-center lg:justify-start gap-2 text-sm text-muted-foreground">
                  <Check className="h-4 w-4 text-primary" />
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
                  onClick={handleCustomPurchase}
                  disabled={loadingCustom}
                  size="lg"
                  className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  {loadingCustom ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <ShoppingCart className="h-5 w-5 mr-2" />
                      Comprar {customCredits} Créditos
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.section>

      {/* Info section */}
      <motion.section 
        className="bg-muted/50 rounded-2xl p-8 border"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <h3 className="text-xl font-semibold mb-4">Como funcionam os créditos?</h3>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Criação Rápida</p>
              <p className="text-sm text-muted-foreground">5 créditos por conteúdo</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Imagem Personalizada</p>
              <p className="text-sm text-muted-foreground">6 créditos por imagem</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Rocket className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">Vídeo</p>
              <p className="text-sm text-muted-foreground">20 créditos por vídeo</p>
            </div>
          </div>
        </div>
      </motion.section>

      <TourSelector 
        tours={[
          {
            tourType: 'navbar',
            steps: navbarSteps,
            label: 'Tour da Navegação',
            targetElement: '#sidebar-logo'
          },
          {
            tourType: 'credits',
            steps: creditsSteps,
            label: 'Tour de Créditos',
            targetElement: '#credits-balance'
          }
        ]}
        startDelay={500}
      />
    </div>
  );
};

export default Credits;
