import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Rocket, Users, Package, Palette, UserCircle, Sparkles, Calendar, FileText, CheckCircle, Crown, Zap, X, AlertTriangle, ArrowLeft, Tag, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import type { Plan } from '@/types/plan';

interface SubscriptionStatus {
  canAccess: boolean;
  isExpired: boolean;
  isTrial: boolean;
  daysRemaining?: number;
  plan?: Plan;
}
const Plans = () => {
  const {
    user,
    team,
    isLoading: authLoading
  } = useAuth();
  
  const [plans, setPlans] = useState<Plan[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [showPlansSelection, setShowPlansSelection] = useState(false);
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isExpired = searchParams.get('expired') === 'true';
  const selectedPlan = searchParams.get('selected');

  const loadPlans = useCallback(async () => {
    try {
      const { data: plansData, error } = await supabase
        .from('plans')
        .select('*')
        .eq('is_active', true)
        .order('price_monthly', { ascending: true });

      if (error) throw error;

      if (plansData) {
        const formattedPlans: Plan[] = plansData.map(p => ({
          id: p.id,
          name: p.name,
          displayName: p.name,
          price: p.price_monthly || 0,
          trialDays: p.trial_days || 0,
          maxMembers: p.max_members,
          maxBrands: p.max_brands,
          maxStrategicThemes: p.max_strategic_themes,
          maxPersonas: p.max_personas,
          quickContentCreations: p.credits_quick_content,
          customContentSuggestions: p.credits_suggestions,
          contentPlans: p.credits_plans,
          contentReviews: p.credits_reviews,
          isActive: p.is_active,
          stripePriceId: p.stripe_price_id_monthly
        }));
        setPlans(formattedPlans);
      }
    } catch (error) {
      console.error('Error loading plans:', error);
      toast.error('Erro ao carregar planos');
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!user?.id || authLoading) {
      return;
    }

    setIsLoading(true);
    try {
      await loadPlans();

      if (team) {
        // Calcular status baseado em subscription_period_end
        const now = new Date();
        const periodEnd = team.subscription_period_end ? new Date(team.subscription_period_end) : null;
        const daysRemaining = periodEnd ? Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;
        const isExpired = team.plan.id === 'free' && periodEnd && periodEnd < now;
        const isTrial = team.plan.id === 'free';
        
        setSubscriptionStatus({
          canAccess: !isExpired,
          isExpired: isExpired || false,
          isTrial,
          daysRemaining: Math.max(0, daysRemaining),
          plan: team.plan
        });
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar informações');
    } finally {
      setIsLoading(false);
    }
  }, [user, team, authLoading, loadPlans]);

  useEffect(() => {
    loadData();
  }, [loadData]);
  const handleSubscribe = async (plan: Plan) => {
    if (!user || !team) {
      navigate('/login');
      return;
    }
    if (plan.price > 0 && !plan.stripePriceId) {
      toast.error('Este plano ainda não está disponível para compra.', {
        description: 'Entre em contato com o suporte.'
      });
      return;
    }
    try {
      setLoadingPlanId(plan.id);
      await new Promise(resolve => setTimeout(resolve, 1000));
      if (plan.price > 0) {
        toast.success('Redirecionando para o checkout...');
        // Redirecionar para Stripe checkout
      } else {
        toast.success('Plano gratuito ativado com sucesso!');
        setShowPlansSelection(false);
        await loadData();
      }
    } catch (error) {
      toast.error('Erro ao iniciar assinatura. Tente novamente.');
    } finally {
      setLoadingPlanId(null);
    }
  };
  if (isLoading || authLoading) {
    return <div className="flex items-center justify-center min-h-[60vh] animate-fade-in">
        <div className="text-center space-y-4">
          <div className="relative mx-auto w-16 h-16">
            <div className="w-16 h-16 border-4 border-secondary/20 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-transparent border-t-secondary rounded-full animate-spin"></div>
          </div>
          <p className="text-muted-foreground">Carregando informações...</p>
        </div>
      </div>;
  }

  // Tela de seleção de planos
  if (subscriptionStatus?.isExpired || showPlansSelection || !subscriptionStatus?.canAccess) {
    return <div className="space-y-6 animate-fade-in">
        <div className="text-center space-y-4">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Escolha seu Plano</h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
            Selecione o plano que melhor atende às necessidades da sua equipe
          </p>

          {isExpired && <Alert className="border-orange-200 bg-orange-50/50 max-w-2xl mx-auto">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800 text-sm">
                Seu período de teste expirou. Escolha um plano para continuar usando o Creator.
              </AlertDescription>
            </Alert>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
          {plans.map(plan => {
          const isCurrentPlan = subscriptionStatus?.plan?.id === plan.id;
          const isSelected = selectedPlan === plan.name;
          const isPopular = plan.name === 'PRO';
          const isPremium = plan.name === 'ENTERPRISE';
          return <Card key={plan.id} className={`relative transition-all duration-200 shadow-lg hover:shadow-2xl ${isPopular ? 'shadow-xl scale-[1.02]' : ''} ${isPremium ? 'shadow-xl' : ''} ${isCurrentPlan ? 'bg-green-50/50 shadow-xl' : ''} ${isSelected ? 'bg-orange-50/50 shadow-2xl' : ''}`}>
                {isPopular && <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-primary text-xs">
                    Mais Popular
                  </Badge>}
                {isPremium && <Badge className="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-secondary text-xs">
                    Premium
                  </Badge>}
                {isCurrentPlan && <Badge className="absolute -top-2 right-2 bg-green-500 text-xs">
                    Atual
                  </Badge>}

                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-xl md:text-2xl">{plan.displayName}</CardTitle>
                  <div className="text-2xl md:text-3xl font-bold text-primary">
                    {plan.price === 0 ? 'Grátis' : `R$ ${plan.price.toFixed(2)}`}
                  </div>
                  {plan.price > 0 && <div className="text-xs text-muted-foreground">por mês</div>}
                  {plan.trialDays > 0 && <Badge variant="outline" className="mx-auto text-xs mt-2">
                      {plan.trialDays} dias grátis
                    </Badge>}
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="space-y-2 text-xs md:text-sm">
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-left">
                        {plan.maxMembers >= 999999 ? 'Membros ilimitados' : `Até ${plan.maxMembers} membros`}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-left">
                        {plan.maxBrands >= 999999 ? 'Marcas ilimitadas' : `${plan.maxBrands} ${plan.maxBrands === 1 ? 'marca' : 'marcas'}`}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-left">
                        {plan.maxStrategicThemes >= 999999 ? 'Temas ilimitados' : `${plan.maxStrategicThemes} temas`}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-left">
                        {plan.maxPersonas >= 999999 ? 'Personas ilimitadas' : `${plan.maxPersonas} personas`}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-left">
                        {plan.quickContentCreations} criações rápidas
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-left">
                        {plan.customContentSuggestions} sugestões
                      </span>
                    </div>
                    {isPremium && <div className="flex items-start gap-2">
                        <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-left font-medium text-secondary">
                          Integrações avançadas
                        </span>
                      </div>}
                  </div>

                  {plan.name !== 'FREE' && (
                    <Button 
                      className="w-full text-xs md:text-sm" 
                      variant={isPopular ? 'default' : 'outline'} 
                      size="sm" 
                      onClick={() => {
                        if (plan.name === 'ENTERPRISE') {
                          toast.info('Redirecionando para o WhatsApp Business...');
                        } else {
                          handleSubscribe(plan);
                        }
                      }} 
                      disabled={isCurrentPlan || loadingPlanId === plan.id || (plan.price > 0 && !plan.stripePriceId && plan.name !== 'ENTERPRISE')}
                    >
                      {isCurrentPlan ? 'Plano Atual' : loadingPlanId === plan.id ? 'Processando...' : plan.name === 'ENTERPRISE' ? 'Entrar em Contato' : plan.price > 0 && !plan.stripePriceId ? 'Em Breve' : 'Assinar Agora'}
                    </Button>
                  )}
                </CardContent>
              </Card>;
        })}
        </div>

        <div className="text-center space-y-4">
          <p className="text-xs md:text-sm text-muted-foreground">
            Todos os planos incluem suporte técnico e atualizações gratuitas
          </p>
          {!isExpired && <Button variant="outline" size="sm" onClick={() => setShowPlansSelection(false)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Painel
            </Button>}
        </div>
      </div>;
  }

  // Verificação de segurança - garantir que temos dados da equipe
  if (!team) {
    return <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4 p-6">
          <AlertTriangle className="h-12 w-12 text-orange-500 mx-auto" />
          <p className="text-lg font-semibold">Erro ao carregar informações</p>
          <p className="text-sm text-muted-foreground">Equipe não encontrada</p>
          <Link to="/dashboard">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Dashboard
            </Button>
          </Link>
        </div>
      </div>;
  }

  const plan = team.plan;
  const credits = team.credits || {
    quickContentCreations: 0,
    contentSuggestions: 0,
    contentReviews: 0,
    contentPlans: 0
  };
  const creditData = [{
    name: 'Criações Rápidas',
    current: credits?.quickContentCreations || 0,
    limit: plan?.quickContentCreations || 0,
    icon: Zap,
    color: 'text-orange-600',
    bgColor: 'bg-orange-500/10'
  }, {
    name: 'Sugestões',
    current: credits?.contentSuggestions || 0,
    limit: plan?.customContentSuggestions || 0,
    icon: Sparkles,
    color: 'text-blue-600',
    bgColor: 'bg-blue-500/10'
  }, {
    name: 'Revisões',
    current: credits?.contentReviews || 0,
    limit: plan?.contentReviews || 0,
    icon: CheckCircle,
    color: 'text-green-600',
    bgColor: 'bg-green-500/10'
  }, {
    name: 'Planejamentos',
    current: credits?.contentPlans || 0,
    limit: plan?.contentPlans || 0,
    icon: Calendar,
    color: 'text-purple-600',
    bgColor: 'bg-purple-500/10'
  }];
  const totalCredits = creditData.reduce((acc, credit) => acc + credit.current, 0);
  const totalLimits = creditData.reduce((acc, credit) => acc + credit.limit, 0);
  const usagePercentage = totalLimits > 0 ? (totalLimits - totalCredits) / totalLimits * 100 : 0;
  return <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Header com design limpo */}
      <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-background rounded-2xl p-6 md:p-8 shadow-lg">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0 bg-primary/10 text-primary rounded-2xl p-4">
              <Crown className="h-8 w-8 md:h-10 md:w-10" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
                Planos e Uso
              </h1>
              <p className="text-sm md:text-base text-muted-foreground">
                Gerencie seu plano e acompanhe o uso de recursos
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowPlansSelection(true)} className="w-full sm:w-auto border-primary/20 hover:bg-primary/5 text-muted-foreground hover:text-muted-foreground">
            <Crown className="h-4 w-4 mr-2 text-muted-foreground hover:text-foreground" />
            Ver Todos os Planos
          </Button>
        </div>
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
                    {plan?.displayName || 'Plano'}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-foreground">Plano Atual</h2>
                    <p className="text-sm text-muted-foreground">
                      Você está usando o plano {plan?.displayName || 'atual'}
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

          {/* Grid de Cards de Créditos - 4 colunas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {creditData.map((credit, index) => {
            const usedCredits = Math.max(0, credit.limit - credit.current);
            const percentage = credit.limit > 0 ? credit.current / credit.limit * 100 : 0;
            const isLow = credit.current <= credit.limit * 0.2;
            const isAtLimit = credit.current <= 0;
            const Icon = credit.icon;
            return <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`p-2 rounded-xl ${credit.bgColor}`}>
                        <Icon className={`h-4 w-4 ${credit.color}`} />
                      </div>
                      <h3 className="font-semibold text-xs xl:text-sm text-foreground">
                        {credit.name}
                      </h3>
                    </div>
                    
                    <div className="space-y-2">
                      <div>
                        <div className="text-2xl xl:text-3xl font-bold text-foreground mb-1">
                          {credit.current.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          de {credit.limit.toLocaleString()} disponíveis
                        </p>
                      </div>
                      
                      <Progress value={percentage} className="h-3 bg-primary/20 mb-3" />
                      
                      <p className={`text-xs font-medium ${isAtLimit ? 'text-destructive' : isLow ? 'text-yellow-600' : 'text-green-600'}`}>
                        {isAtLimit ? '⚠ Créditos esgotados' : isLow ? '⚡ Poucos créditos' : '✓ Créditos disponíveis'}
                      </p>
                    </div>
                  </CardContent>
                </Card>;
          })}
          </div>

          {/* Limites de Recursos */}
          <Card className="shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Limites de Recursos</CardTitle>
              <p className="text-sm text-muted-foreground">
                Recursos disponíveis no seu plano atual
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                {[{
                icon: Tag,
                label: 'Marcas',
                value: plan?.maxBrands || 0,
                color: 'text-pink-600',
                bg: 'bg-pink-500/10'
              }, {
                icon: Palette,
                label: 'Temas',
                value: plan?.maxStrategicThemes || 0,
                color: 'text-purple-600',
                bg: 'bg-purple-500/10'
              }, {
                icon: Users,
                label: 'Personas',
                value: plan?.maxPersonas || 0,
                color: 'text-green-600',
                bg: 'bg-green-500/10'
              }, {
                icon: UserCircle,
                label: 'Membros',
                value: plan?.maxMembers || 0,
                color: 'text-blue-600',
                bg: 'bg-blue-500/10'
              }].map((item, idx) => {
                const Icon = item.icon;
                return <div key={idx} className={`flex items-center gap-2 p-3 rounded-xl ${item.bg} shadow-sm hover:shadow-md transition-all`}>
                      <div className="flex-shrink-0">
                        <Icon className={`h-5 w-5 ${item.color}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-xs xl:text-sm text-foreground truncate">{item.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.value >= 999999 ? 'Ilimitado' : `até ${item.value}`}
                        </p>
                      </div>
                    </div>;
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
                {[{
                to: '/brands',
                icon: Tag,
                label: 'Gerenciar Marcas'
              }, {
                to: '/themes',
                icon: Palette,
                label: 'Gerenciar Temas'
              }, {
                to: '/personas',
                icon: Users,
                label: 'Gerenciar Personas'
              }].map((action, idx) => {
                const Icon = action.icon;
                return <Link key={idx} to={action.to}>
                      <Button variant="outline" size="default" className="w-full justify-start py-6 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-200 border-border/50">
                        <Icon className="h-5 w-5 mr-3" />
                        <span className="font-medium">{action.label}</span>
                      </Button>
                    </Link>;
              })}
              </CardContent>
            </Card>

            {/* Card do Plano Atual - Detalhado */}
            <Card className="bg-gradient-to-br from-primary/5 to-background shadow-xl flex-1">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-lg font-bold">
                    {plan?.displayName || 'Plano Atual'}
                  </CardTitle>
                  <Badge className="bg-primary text-primary-foreground text-xs">
                    Seu Plano
                  </Badge>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-primary">
                    R${(plan?.price || 0).toFixed(2)}
                  </span>
                  <span className="text-sm text-muted-foreground">/mês</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2.5">
                {[{
                label: 'Todas as funcionalidades básicas',
                included: true
              }, {
                label: 'Suporte via email',
                included: true
              }, {
                label: 'Suporte prioritário',
                included: (plan?.price || 0) > 0
              }, {
                label: 'Integrações avançadas',
                included: plan?.name === 'ENTERPRISE'
              }].map((feature, idx) => <div key={idx} className="flex items-center gap-2.5">
                    {feature.included ? <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" /> : <X className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
                    <span className={`text-sm ${feature.included ? 'text-foreground' : 'text-muted-foreground line-through'}`}>
                      {feature.label}
                    </span>
                  </div>)}
              </CardContent>
            </Card>
          </div>

          {/* Info da Equipe */}
          
        </div>
      </div>
    </div>;
};
export default Plans;