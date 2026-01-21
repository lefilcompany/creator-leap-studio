import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/hooks/useAuth";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Rocket,
  Users,
  Package,
  Palette,
  UserCircle,
  Sparkles,
  Calendar,
  FileText,
  CheckCircle,
  Crown,
  Zap,
  X,
  AlertTriangle,
  ArrowLeft,
  Tag,
  Building2,
  Video,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Plan } from "@/types/plan";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";

interface SubscriptionStatus {
  canAccess: boolean;
  isExpired: boolean;
  isTrial: boolean;
  daysRemaining?: number;
  plan?: Plan;
}
const Plans = () => {
  const { user, team, isLoading: authLoading } = useAuth();

  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPlansSelection, setShowPlansSelection] = useState(false);
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const [userPlan, setUserPlan] = useState<Plan | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isExpired = searchParams.get("expired") === "true";
  const selectedPlan = searchParams.get("selected");
  const checkingSubscription = useRef(false);

  const loadPlans = useCallback(async () => {
    try {
      const { data: plansData, error } = await supabase
        .from("plans")
        .select("*")
        .eq("is_active", true);

      if (error) throw error;

      if (plansData) {
        const formattedPlans: Plan[] = plansData.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description || '',
          price: p.price_monthly || 0,
          credits: (p as any).credits || 0,
          maxMembers: p.max_members,
          maxBrands: p.max_brands,
          maxStrategicThemes: p.max_strategic_themes,
          maxPersonas: p.max_personas,
          trialDays: p.trial_days || 0,
          isActive: p.is_active,
          stripePriceId: p.stripe_price_id_monthly,
          stripeProductId: p.stripe_product_id,
        }));
        
        // Ordenar manualmente: Light, Básico, Pro, Enterprise
        const planOrder = { free: 1, basic: 2, pro: 3, enterprise: 4 };
        const sortedPlans = formattedPlans.sort((a, b) => {
          return (planOrder[a.id as keyof typeof planOrder] || 999) - (planOrder[b.id as keyof typeof planOrder] || 999);
        });
        
        setPlans(sortedPlans);

        // Buscar plano do usuário
        if (user?.planId) {
          const foundPlan = sortedPlans.find(p => p.id === user.planId);
          if (foundPlan) {
            setUserPlan(foundPlan);
          }
        }
      }
    } catch (error) {
      console.error("Error loading plans:", error);
      toast.error("Erro ao carregar planos");
    }
  }, [user?.planId]);

  const subscriptionStatus = useMemo<SubscriptionStatus | null>(() => {
    if (!user) return null;

    const now = new Date();
    const periodEnd = user.subscriptionPeriodEnd ? new Date(user.subscriptionPeriodEnd) : null;
    const daysRemaining = periodEnd ? Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;
    const currentPlanId = user.planId || "free";
    const isExpiredStatus = currentPlanId === "free" && periodEnd && periodEnd < now;
    const isTrial = currentPlanId === "free";

    return {
      canAccess: !isExpiredStatus,
      isExpired: isExpiredStatus || false,
      isTrial,
      daysRemaining: Math.max(0, daysRemaining),
      plan: userPlan || undefined,
    };
  }, [user, userPlan]);

  const loadData = useCallback(async () => {
    if (!user?.id || authLoading) {
      return;
    }

    setIsLoading(true);
    try {
      await loadPlans();
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Erro ao carregar informações");
    } finally {
      setIsLoading(false);
    }
  }, [user, authLoading, loadPlans]);

  const checkSubscriptionStatus = useCallback(async () => {
    if (checkingSubscription.current) {
      console.log("[CHECK-SUBSCRIPTION] Verificação já em andamento, ignorando...");
      return false;
    }

    checkingSubscription.current = true;
    const MAX_RETRIES = 10;
    const RETRY_INTERVAL = 3000;
    let currentRetry = 0;

    const attemptCheck = async (): Promise<boolean> => {
      try {
        currentRetry++;

        console.log(`[CHECK-SUBSCRIPTION] Tentativa ${currentRetry}/${MAX_RETRIES}`);
        
        toast.info(`Verificando pagamento... (${currentRetry}/${MAX_RETRIES})`, {
          id: "subscription-check",
          description: "Aguarde enquanto confirmamos sua assinatura",
        });

        const { data, error } = await supabase.functions.invoke("check-subscription");

        if (error) {
          console.error("[CHECK-SUBSCRIPTION] Erro:", error);
          throw error;
        }

        console.log("[CHECK-SUBSCRIPTION] Resposta:", data);

        if (data?.subscribed) {
          toast.success("✓ Pagamento confirmado!", {
            id: "subscription-check",
            description: `Plano ${data.plan_id} ativado com sucesso`,
          });

          checkingSubscription.current = false;
          window.location.href = "/dashboard?payment_success=true";
          return true;
        }

        if (currentRetry >= MAX_RETRIES) {
          toast.error("Tempo limite excedido", {
            id: "subscription-check",
            description: 'O pagamento pode estar sendo processado. Tente novamente em alguns minutos.',
          });
          checkingSubscription.current = false;
          return false;
        }

        console.log("[CHECK-SUBSCRIPTION] Assinatura não encontrada, tentando novamente...");
        await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL));
        return attemptCheck();
      } catch (error) {
        console.error("[CHECK-SUBSCRIPTION] Erro na tentativa:", error);

        if (currentRetry >= MAX_RETRIES) {
          toast.error("Erro ao verificar pagamento", {
            id: "subscription-check",
            description: "Entre em contato com o suporte se o problema persistir",
          });
          checkingSubscription.current = false;
          return false;
        }

        await new Promise((resolve) => setTimeout(resolve, RETRY_INTERVAL));
        return attemptCheck();
      }
    };

    return attemptCheck();
  }, []);

  useEffect(() => {
    const success = searchParams.get("success");
    const canceled = searchParams.get("canceled");

    if (success === "true" && !checkingSubscription.current) {
      checkSubscriptionStatus();
    }

    if (canceled === "true") {
      toast.info("Checkout cancelado", {
        description: "Você pode tentar novamente quando quiser",
      });
    }

    loadData();
  }, [loadData, checkSubscriptionStatus]);
  const handleSubscribe = async (plan: Plan) => {
    if (!user) {
      navigate("/");
      return;
    }

    if (plan.price > 0 && !plan.stripePriceId) {
      toast.error("Este plano ainda não está disponível para compra.", {
        description: "Entre em contato com o suporte.",
      });
      return;
    }

    try {
      setLoadingPlanId(plan.id);
      
      console.log('[CREATE-CHECKOUT] Iniciando checkout:', { planId: plan.id, stripePriceId: plan.stripePriceId });

      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { 
          type: 'plan',
          price_id: plan.stripePriceId,
          plan_id: plan.id,
          return_url: '/plans'
        },
      });

      if (error) {
        console.error('[CREATE-CHECKOUT] Erro:', error);
        throw error;
      }

      console.log('[CREATE-CHECKOUT] Resposta:', data);

      if (data?.url) {
        toast.success("Abrindo página de pagamento...", {
          description: "Uma nova aba será aberta com o checkout do Stripe"
        });
        
        // Open Stripe Checkout in new tab
        setTimeout(() => {
          window.open(data.url, '_blank');
        }, 500);
      }
    } catch (error) {
      console.error("[CREATE-CHECKOUT] Erro ao criar sessão:", error);
      toast.error("Erro ao iniciar assinatura", {
        description: error instanceof Error ? error.message : "Tente novamente em alguns instantes"
      });
    } finally {
      setLoadingPlanId(null);
    }
  };
  const isLoadingState = isLoading || authLoading || !subscriptionStatus;

  if (isLoadingState) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <div className="relative mx-auto w-16 h-16">
            <div className="w-16 h-16 border-4 border-secondary/20 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-secondary rounded-full animate-spin"></div>
          </div>
          <p className="text-muted-foreground">Carregando informações...</p>
        </div>
      </div>
    );
  }

  // Tela de seleção de planos
  if (subscriptionStatus?.isExpired || showPlansSelection || !subscriptionStatus?.canAccess) {
    return (
      <div className="space-y-6 animate-fade-in">
        {/* Breadcrumb Navigation */}
        <PageBreadcrumb items={[{ label: "Planos" }]} />

        <div className="text-center space-y-4">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Escolha seu Plano</h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
            Selecione o plano que melhor atende às necessidades da sua equipe
          </p>

          {isExpired && (
            <Alert className="border-orange-200 bg-orange-50/50 max-w-2xl mx-auto">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800 text-sm">
                Seu período de teste expirou. Escolha um plano para continuar usando o Creator.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
          {plans.map((plan) => {
            const isCurrentPlan = subscriptionStatus?.plan?.id === plan.id;
            const isSelected = selectedPlan === plan.name;
            const isPopular = plan.name === "Pro";
            const isPremium = plan.name === "Enterprise";
            return (
              <Card
                key={plan.id}
                className={`relative transition-all duration-200 shadow-lg hover:shadow-2xl ${isPopular ? "shadow-xl scale-[1.02]" : ""} ${isPremium ? "shadow-xl" : ""} ${isCurrentPlan ? "bg-green-50/50 shadow-xl" : ""} ${isSelected ? "bg-orange-50/50 shadow-2xl" : ""}`}
              >
                {isPopular && (
                  <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-primary text-xs">
                    Mais Popular
                  </Badge>
                )}
                {isPremium && (
                  <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-secondary text-xs">
                    Premium
                  </Badge>
                )}
                {isCurrentPlan && <Badge className="absolute -top-2 right-2 bg-green-500 text-xs">Atual</Badge>}

                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-xl md:text-2xl">{plan.name}</CardTitle>
                  <div className="text-2xl md:text-3xl font-bold text-primary">
                    {plan.name === "Enterprise" 
                      ? "Sob consulta"
                      : plan.price === 0 && plan.name !== "Light"
                        ? "Grátis" 
                        : `R$ ${plan.price.toFixed(2)}`}
                  </div>
                  {plan.price > 0 && plan.name !== "Enterprise" && <div className="text-xs text-muted-foreground">por mês</div>}
                  {plan.trialDays > 0 && (
                    <Badge variant="outline" className="mx-auto text-xs mt-2">
                      {plan.trialDays} dias grátis
                    </Badge>
                  )}
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="space-y-2 text-xs md:text-sm">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-left">
                        {plan.maxMembers >= 999999 ? "Membros ilimitados" : `Até ${plan.maxMembers} membros`}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-left">
                        {plan.maxBrands >= 999999
                          ? "Marcas ilimitadas"
                          : `${plan.maxBrands} ${plan.maxBrands === 1 ? "marca" : "marcas"}`}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-left">
                        {plan.maxStrategicThemes >= 999999 ? "Temas ilimitados" : `${plan.maxStrategicThemes} temas`}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-left">
                        {plan.maxPersonas >= 999999 ? "Personas ilimitadas" : `${plan.maxPersonas} personas`}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-left">{plan.credits} créditos mensais</span>
                    </div>
                    {isPremium && (
                      <>
                        <div className="flex items-start gap-2">
                          <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-left text-xs">Estratégia personalizada</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-left text-xs">Acompanhamento dedicado</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-left text-xs">Gerente de sucesso</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-500 flex-shrink-0 mt-0.5" />
                          <span className="text-left text-xs">Atendimento prioritário</span>
                        </div>
                      </>
                    )}
                  </div>

                  {plan.name === "Light" ? (
                    <Button
                      className="w-full text-sm font-semibold shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-300 active:scale-[0.98] border-2 border-primary/30 hover:bg-primary/10 hover:border-primary/50"
                      variant="outline"
                      size="sm"
                      onClick={() => handleSubscribe(plan)}
                      disabled={isCurrentPlan || loadingPlanId === plan.id || !plan.stripePriceId}
                    >
                      {isCurrentPlan
                        ? "Plano Atual"
                        : loadingPlanId === plan.id
                          ? "Processando..."
                          : !plan.stripePriceId
                            ? "Em Breve"
                            : subscriptionStatus?.isExpired
                              ? "Assinar Agora"
                              : "Iniciar Trial de 7 dias"}
                    </Button>
                  ) : plan.name === "Enterprise" ? (
                    <Button
                      className="w-full text-sm font-semibold bg-gradient-to-r from-secondary via-secondary/90 to-accent hover:from-secondary/90 hover:via-secondary/80 hover:to-accent/90 shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-300 active:scale-[0.98]"
                      size="sm"
                      disabled={isCurrentPlan}
                      asChild
                    >
                      <a 
                        href="https://wa.me/558199660072" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-2"
                      >
                        {isCurrentPlan ? "Plano Atual" : "Falar no WhatsApp"}
                      </a>
                    </Button>
                  ) : (
                    <Button
                      className={`w-full text-sm font-semibold shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-300 active:scale-[0.98] ${
                        isPopular 
                          ? "bg-gradient-to-r from-primary via-primary/90 to-secondary hover:from-primary/90 hover:via-primary/80 hover:to-secondary/90" 
                          : "border-2 border-primary/30 hover:bg-primary/10 hover:border-primary/50"
                      }`}
                      variant={isPopular ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleSubscribe(plan)}
                      disabled={isCurrentPlan || loadingPlanId === plan.id || !plan.stripePriceId}
                    >
                      {isCurrentPlan
                        ? "Plano Atual"
                        : loadingPlanId === plan.id
                          ? "Processando..."
                          : !plan.stripePriceId
                            ? "Em Breve"
                            : "Assinar Agora"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center space-y-4">
          <p className="text-xs md:text-sm text-muted-foreground">
            Todos os planos incluem suporte técnico e atualizações gratuitas
          </p>
          {!isExpired && (
            <Button variant="outline" size="sm" onClick={() => setShowPlansSelection(false)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Painel
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Verificação de segurança - garantir que temos dados do usuário
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4 p-6">
          <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto" />
          <p className="text-lg font-semibold">Erro ao carregar informações</p>
          <p className="text-sm text-muted-foreground">Usuário não autenticado</p>
          <Link to="/dashboard">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const plan = userPlan;
  const credits = user.credits || 0;
  const isEnterprisePlan = plan?.name === "Enterprise";

  const creditData = {
    name: "Créditos",
    current: credits,
    limit: isEnterprisePlan ? credits : plan?.credits || 0,
    icon: Zap,
    color: "text-orange-600",
    bgColor: "bg-orange-500/10",
  };
  
  const totalCredits = credits;
  const totalLimits = isEnterprisePlan ? totalCredits : plan?.credits || 0;
  const usagePercentage = totalLimits > 0 ? ((totalLimits - totalCredits) / totalLimits) * 100 : 0;
  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Header com design limpo */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background rounded-2xl p-6 md:p-8 shadow-lg">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0 bg-primary/10 text-primary rounded-2xl p-4">
            <Crown className="h-8 w-8 md:h-10 md:w-10" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">Planos e Uso</h1>
            <p className="text-sm md:text-base text-muted-foreground">
              Gerencie seu plano e acompanhe o uso de recursos
            </p>
          </div>
        </div>
      </div>

      {/* Botão Ver Todos os Planos em Destaque */}
      <div>
        <Button
          variant="default"
          size="lg"
          onClick={() => setShowPlansSelection(true)}
          className="w-full bg-gradient-to-r from-primary via-primary/90 to-secondary hover:from-primary/90 hover:via-primary/80 hover:to-secondary/90 shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 text-base font-semibold px-8 active:scale-[0.98]"
        >
          <Crown className="h-5 w-5 mr-2" />
          Ver Todos os Planos
        </Button>
      </div>

      {/* Grid principal: Esquerda (conteúdo) + Direita (sidebar) */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4 md:gap-6">
        {/* Coluna Esquerda - Conteúdo Principal */}
        <div className="space-y-4 md:space-y-6">
          {/* Card Plano Atual com destaque para créditos totais */}
          <Card className="bg-gradient-to-br from-primary/5 via-background to-background shadow-xl">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 bg-primary text-primary-foreground rounded-xl px-3 py-1.5 font-semibold text-sm">
                    {plan?.name || "Plano"}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Plano Atual</h2>
                    <p className="text-sm text-muted-foreground">
                      Você está usando o plano {plan?.name || "atual"}
                    </p>
                  </div>
                </div>
                <div className="text-center md:text-right">
                  <div className="text-2xl md:text-3xl font-bold text-primary mb-1">
                    {totalCredits.toLocaleString()}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    de {totalLimits.toLocaleString()} créditos disponíveis
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Card de créditos único */}
          <Card className="border-0 shadow-lg hover:shadow-xl transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", creditData.bgColor)}>
                    <creditData.icon className={cn("h-5 w-5", creditData.color)} />
                  </div>
                  <h3 className="font-semibold text-foreground">{creditData.name}</h3>
                </div>
                <span className="text-xs text-muted-foreground">Disponíveis</span>
              </div>
              <div className="space-y-2">
                <div className="text-3xl font-bold text-foreground">{creditData.current}</div>
                {!isEnterprisePlan && (
                  <>
                    <Progress value={(creditData.current / creditData.limit) * 100} className="h-2" />
                    <p className="text-xs text-muted-foreground">de {creditData.limit} no total</p>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Limites de Recursos */}
          <Card className="shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Limites de Recursos</CardTitle>
              <p className="text-sm text-muted-foreground">Recursos disponíveis no seu plano atual</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                {[
                  {
                    icon: Tag,
                    label: "Marcas",
                    value: plan?.maxBrands || 0,
                    color: "text-pink-600",
                    bg: "bg-pink-500/10",
                  },
                  {
                    icon: Palette,
                    label: "Temas",
                    value: plan?.maxStrategicThemes || 0,
                    color: "text-purple-600",
                    bg: "bg-purple-500/10",
                  },
                  {
                    icon: Users,
                    label: "Personas",
                    value: plan?.maxPersonas || 0,
                    color: "text-green-600",
                    bg: "bg-green-500/10",
                  },
                  {
                    icon: UserCircle,
                    label: "Membros",
                    value: plan?.maxMembers || 0,
                    color: "text-blue-600",
                    bg: "bg-blue-500/10",
                  },
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div
                      key={idx}
                      className={`flex items-center gap-2 p-3 rounded-xl ${item.bg} shadow-sm hover:shadow-md transition-all`}
                    >
                      <div className="flex-shrink-0">
                        <Icon className={`h-5 w-5 ${item.color}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-xs xl:text-sm text-foreground truncate">{item.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.value >= 999999 ? "Ilimitado" : `até ${item.value}`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Cards de Ações com IA */}
        </div>

        {/* Coluna Direita - Sidebar */}
        <div className="space-y-4">
          {/* Grid com Ações Rápidas e Plano Atual lado a lado */}
          <div className="flex flex-col md:flex-row xl:flex-col gap-4">
            {/* Ações Rápidas */}
            <Card className="shadow-lg flex-1">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Ações Rápidas</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {[
                  {
                    to: "/brands",
                    icon: Tag,
                    label: "Gerenciar Marcas",
                  },
                  {
                    to: "/themes",
                    icon: Palette,
                    label: "Gerenciar Temas",
                  },
                  {
                    to: "/personas",
                    icon: Users,
                    label: "Gerenciar Personas",
                  },
                ].map((action, idx) => {
                  const Icon = action.icon;
                  return (
                    <Link key={idx} to={action.to}>
                      <Button
                        variant="outline"
                        size="default"
                        className="w-full justify-start py-6 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200 border-border/50"
                      >
                        <Icon className="h-5 w-5 mr-3" />
                        <span className="font-medium">{action.label}</span>
                      </Button>
                    </Link>
                  );
                })}
              </CardContent>
            </Card>

            {/* Card do Plano Atual - Detalhado */}
            <Card className="bg-gradient-to-br from-primary/5 to-background shadow-xl flex-1">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-lg font-bold">{plan?.name || "Plano Atual"}</CardTitle>
                  <Badge className="bg-primary text-primary-foreground text-xs">Seu Plano</Badge>
                </div>
                <div className="flex items-baseline gap-1">
                  {user.planId === 'free' && user.subscriptionStatus === 'trialing' ? (
                    <>
                      <span className="text-3xl font-bold text-primary">Teste Grátis</span>
                      <span className="text-sm text-muted-foreground">
                        {user.subscriptionPeriodEnd && 
                          `- ${Math.ceil((new Date(user.subscriptionPeriodEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} dias restantes`
                        }
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-3xl font-bold text-primary">R${(plan?.price || 0).toFixed(2)}</span>
                      <span className="text-sm text-muted-foreground">/mês</span>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {[
                  {
                    label: "Todas as funcionalidades básicas",
                    included: true,
                  },
                  {
                    label: "Suporte via email",
                    included: true,
                  },
                  {
                    label: "Suporte prioritário",
                    included: (plan?.price || 0) > 0,
                  },
                  {
                    label: "Integrações avançadas",
                    included: plan?.name === "Enterprise",
                  },
                ].map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2.5">
                    {feature.included ? (
                      <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <span
                      className={`text-sm ${feature.included ? "text-foreground" : "text-muted-foreground line-through"}`}
                    >
                      {feature.label}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Info da Equipe */}
        </div>
      </div>
    </div>
  );
};
export default Plans;
