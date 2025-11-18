import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Rocket,
  Users,
  Package,
  Palette,
  UserCircle,
  Sparkles,
  Crown,
  Zap,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Plan } from "@/types/plan";

interface PlanSelectorProps {
  onPlanSelected?: (planId: string) => void;
  onCheckoutComplete?: () => void;
  showCurrentPlan?: boolean;
}

const planIcons: Record<string, any> = {
  free: Rocket,
  basic: Package,
  pro: Crown,
  enterprise: Sparkles,
};

const planColors: Record<string, string> = {
  free: "from-blue-500/20 to-blue-600/20",
  basic: "from-green-500/20 to-green-600/20",
  pro: "from-purple-500/20 to-purple-600/20",
  enterprise: "from-orange-500/20 to-orange-600/20",
};

export function PlanSelector({ onPlanSelected, onCheckoutComplete, showCurrentPlan = true }: PlanSelectorProps) {
  const { user, team } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);

  const loadPlans = useCallback(async () => {
    try {
      const { data: plansData, error } = await supabase
        .from("plans")
        .select("*")
        .eq("is_active", true)
        .eq("can_subscribe_online", true);

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
        
        // Ordenar: free, basic, pro, enterprise
        const planOrder = { free: 1, basic: 2, pro: 3, enterprise: 4 };
        const sortedPlans = formattedPlans.sort((a, b) => {
          return (planOrder[a.id as keyof typeof planOrder] || 999) - (planOrder[b.id as keyof typeof planOrder] || 999);
        });
        
        setPlans(sortedPlans);
      }
    } catch (error) {
      console.error("Error loading plans:", error);
      toast.error("Erro ao carregar planos");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const handleSelectPlan = async (plan: Plan) => {
    if (!user || !team) {
      toast.error("Você precisa estar autenticado e ter uma equipe");
      return;
    }

    // Plano free não precisa checkout
    if (plan.id === 'free') {
      toast.info("Você já está no plano gratuito");
      return;
    }

    setLoadingPlanId(plan.id);

    try {
      // Mapeamento de links diretos do Stripe
      const stripeLinks: Record<string, string> = {
        'pack_basic': 'https://buy.stripe.com/00wcN4gyBccI4t7aO83oA07',
        'pack_pro': 'https://buy.stripe.com/9B6aEW9696So7Fje0k3oA08',
        'pack_premium': 'https://buy.stripe.com/5kQ3cu969ccI6Bf7BW3oA09',
        'pack_business': 'https://buy.stripe.com/6oU4gyfuxb8E5xb6xS3oA0a',
        'pack_enterprise': 'https://buy.stripe.com/14AdR84PTa4A3p33lG3oA0b',
      };

      const checkoutUrl = stripeLinks[plan.id];
      
      if (!checkoutUrl) {
        toast.error("Este plano não está disponível para compra online. Entre em contato conosco.");
        return;
      }

      // Adicionar parâmetros de retorno na URL
      const returnUrl = window.location.pathname.includes('/onboarding') 
        ? `${window.location.origin}/onboarding-success`
        : `${window.location.origin}/payment-success`;
      
      const urlWithParams = `${checkoutUrl}?client_reference_id=${team.id}&prefilled_email=${user.email}`;
      
      // Abrir Stripe Checkout em nova aba
      window.open(urlWithParams, '_blank');
      
      toast.info('Janela do Stripe aberta!', {
        description: "Complete o pagamento na nova aba. Após a confirmação, seus créditos serão adicionados automaticamente.",
        duration: 10000,
      });

      if (onPlanSelected) {
        onPlanSelected(plan.id);
      }
    } catch (error: any) {
      console.error("Erro ao processar pagamento:", error);
      toast.error(error.message || "Erro ao processar pagamento");
    } finally {
      setLoadingPlanId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {plans.map((plan) => {
        const Icon = planIcons[plan.id] || Zap;
        const isCurrentPlan = showCurrentPlan && team?.plan.id === plan.id;
        const gradientClass = planColors[plan.id] || "from-gray-500/20 to-gray-600/20";

        return (
          <Card
            key={plan.id}
            className={cn(
              "relative overflow-hidden transition-all duration-300 hover:shadow-xl",
              isCurrentPlan && "ring-2 ring-primary shadow-xl"
            )}
          >
            <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50", gradientClass)} />
            
            <CardHeader className="relative">
              <div className="flex items-start justify-between mb-4">
                <div className={cn(
                  "p-3 rounded-lg",
                  plan.id === 'free' && "bg-blue-500/10",
                  plan.id === 'basic' && "bg-green-500/10",
                  plan.id === 'pro' && "bg-purple-500/10",
                  plan.id === 'enterprise' && "bg-orange-500/10"
                )}>
                  <Icon className="h-6 w-6" />
                </div>
                {isCurrentPlan && (
                  <Badge variant="default" className="text-xs">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Seu Plano
                  </Badge>
                )}
              </div>
              
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <CardDescription className="min-h-[3rem]">{plan.description}</CardDescription>
              
              <div className="mt-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold">
                    R$ {plan.price.toLocaleString('pt-BR')}
                  </span>
                  <span className="text-muted-foreground">/mês</span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="relative space-y-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4 text-primary flex-shrink-0" />
                  <span>{plan.credits.toLocaleString('pt-BR')} créditos/mês</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-primary flex-shrink-0" />
                  <span>{plan.maxMembers} {plan.maxMembers === 1 ? 'membro' : 'membros'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Package className="h-4 w-4 text-primary flex-shrink-0" />
                  <span>{plan.maxBrands} {plan.maxBrands === 1 ? 'marca' : 'marcas'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Palette className="h-4 w-4 text-primary flex-shrink-0" />
                  <span>{plan.maxStrategicThemes} {plan.maxStrategicThemes === 1 ? 'tema' : 'temas'} estratégicos</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <UserCircle className="h-4 w-4 text-primary flex-shrink-0" />
                  <span>{plan.maxPersonas} personas</span>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={() => handleSelectPlan(plan)}
                disabled={isCurrentPlan || loadingPlanId === plan.id || plan.id === 'free'}
                variant={isCurrentPlan ? "secondary" : "default"}
              >
                {loadingPlanId === plan.id ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processando...
                  </>
                ) : isCurrentPlan ? (
                  "Plano Atual"
                ) : plan.id === 'free' ? (
                  "Plano Gratuito"
                ) : (
                  "Assinar Plano"
                )}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
