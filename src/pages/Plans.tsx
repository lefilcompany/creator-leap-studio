import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
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
  Building2
} from 'lucide-react';
import type { Plan } from '@/types/plan';
import type { Team } from '@/types/theme';

interface SubscriptionStatus {
  canAccess: boolean;
  isExpired: boolean;
  isTrial: boolean;
  daysRemaining?: number;
  plan?: Plan;
}

const Plans = () => {
  const { user, team: authTeam } = useAuth();
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamData, setTeamData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
  const [showPlansSelection, setShowPlansSelection] = useState(false);
  const [loadingPlanId, setLoadingPlanId] = useState<string | null>(null);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isExpired = searchParams.get('expired') === 'true';
  const selectedPlan = searchParams.get('selected');
  
  const team = teams.find(t => t.id === user?.teamId) || authTeam;

  // Mock data - substituir com chamadas reais de API
  const mockPlans: Plan[] = [
    {
      id: '1',
      name: 'FREE',
      displayName: 'Free',
      price: 0,
      trialDays: 0,
      maxMembers: 2,
      maxBrands: 1,
      maxStrategicThemes: 3,
      maxPersonas: 2,
      quickContentCreations: 5,
      customContentSuggestions: 10,
      contentPlans: 2,
      contentReviews: 5,
      isActive: true,
    },
    {
      id: '2',
      name: 'BASIC',
      displayName: 'Básico',
      price: 49.90,
      trialDays: 7,
      maxMembers: 5,
      maxBrands: 5,
      maxStrategicThemes: 10,
      maxPersonas: 10,
      quickContentCreations: 50,
      customContentSuggestions: 100,
      contentPlans: 20,
      contentReviews: 50,
      isActive: true,
      stripePriceId: 'price_basic',
    },
    {
      id: '3',
      name: 'PRO',
      displayName: 'Profissional',
      price: 99.90,
      trialDays: 14,
      maxMembers: 10,
      maxBrands: 20,
      maxStrategicThemes: 50,
      maxPersonas: 30,
      quickContentCreations: 200,
      customContentSuggestions: 500,
      contentPlans: 100,
      contentReviews: 200,
      isActive: true,
      stripePriceId: 'price_pro',
    },
    {
      id: '4',
      name: 'ENTERPRISE',
      displayName: 'Enterprise',
      price: 299.90,
      trialDays: 14,
      maxMembers: 999999,
      maxBrands: 999999,
      maxStrategicThemes: 999999,
      maxPersonas: 999999,
      quickContentCreations: 1000,
      customContentSuggestions: 2000,
      contentPlans: 500,
      contentReviews: 1000,
      isActive: true,
    },
  ];

  const mockCredits = {
    quickContentCreations: 150,
    contentSuggestions: 380,
    contentReviews: 145,
    contentPlans: 67,
  };

  const loadData = useCallback(async () => {
    if (!user?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // Simular carregamento de dados
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setPlans(mockPlans);
      setTeamData({
        credits: mockCredits,
        plan: team?.plan || mockPlans[2], // Pro como padrão
      });
      
      setSubscriptionStatus({
        canAccess: true,
        isExpired: false,
        isTrial: false,
        plan: team?.plan || mockPlans[2],
      });
    } catch (error) {
      toast.error('Erro ao carregar informações');
    } finally {
      setIsLoading(false);
    }
  }, [user, team]);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] animate-fade-in">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {plans.map((plan) => {
            const isCurrentPlan = subscriptionStatus?.plan?.id === plan.id;
            const isSelected = selectedPlan === plan.name;
            const isPopular = plan.name === 'PRO';
            const isPremium = plan.name === 'ENTERPRISE';
            
            return (
              <Card
                key={plan.id}
                className={`relative transition-all duration-200 hover:shadow-lg ${
                  isPopular ? 'border-primary shadow-md scale-[1.02]' : ''
                } ${
                  isPremium ? 'border-secondary shadow-md' : ''
                } ${
                  isCurrentPlan ? 'border-green-500 bg-green-50/50' : ''
                } ${
                  isSelected ? 'border-orange-500 bg-orange-50/50 shadow-xl' : ''
                }`}
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
                {isCurrentPlan && (
                  <Badge className="absolute -top-2 right-2 bg-green-500 text-xs">
                    Atual
                  </Badge>
                )}

                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-xl md:text-2xl">{plan.displayName}</CardTitle>
                  <div className="text-2xl md:text-3xl font-bold text-primary">
                    {plan.price === 0 ? 'Grátis' : `R$ ${plan.price.toFixed(2)}`}
                  </div>
                  {plan.price > 0 && <div className="text-xs text-muted-foreground">por mês</div>}
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
                    {isPremium && (
                      <div className="flex items-start gap-2">
                        <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-left font-medium text-secondary">
                          Integrações avançadas
                        </span>
                      </div>
                    )}
                  </div>

                  <Button
                    className="w-full text-xs md:text-sm"
                    variant={isPopular ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleSubscribe(plan)}
                    disabled={
                      isCurrentPlan || 
                      loadingPlanId === plan.id ||
                      (plan.price > 0 && !plan.stripePriceId) ||
                      plan.name === 'ENTERPRISE'
                    }
                  >
                    {isCurrentPlan ? 'Plano Atual' : 
                     loadingPlanId === plan.id ? 'Processando...' :
                     plan.name === 'FREE' ? 'Continuar Grátis' :
                     plan.name === 'ENTERPRISE' ? 'Em Breve' :
                     plan.price > 0 && !plan.stripePriceId ? 'Em Breve' :
                     'Assinar Agora'}
                  </Button>
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPlansSelection(false)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar ao Painel
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Verificação de segurança - sempre garantir que temos um plano válido
  const plan = team?.plan || mockPlans[0]; // Fallback para plano Free
  const credits = teamData?.credits || mockCredits;

  if (!team) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
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
      </div>
    );
  }

  const creditData = [
    {
      name: 'Criações Rápidas',
      current: credits?.quickContentCreations || 0,
      limit: plan?.quickContentCreations || 0,
      icon: Zap,
      color: 'text-orange-600',
      bgColor: 'bg-orange-500/10',
    },
    {
      name: 'Sugestões',
      current: credits?.contentSuggestions || 0,
      limit: plan?.customContentSuggestions || 0,
      icon: Sparkles,
      color: 'text-blue-600',
      bgColor: 'bg-blue-500/10',
    },
    {
      name: 'Revisões',
      current: credits?.contentReviews || 0,
      limit: plan?.contentReviews || 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-500/10',
    },
    {
      name: 'Planejamentos',
      current: credits?.contentPlans || 0,
      limit: plan?.contentPlans || 0,
      icon: Calendar,
      color: 'text-purple-600',
      bgColor: 'bg-purple-500/10',
    },
  ];

  const totalCredits = creditData.reduce((acc, credit) => acc + credit.current, 0);
  const totalLimits = creditData.reduce((acc, credit) => acc + credit.limit, 0);
  const usagePercentage = totalLimits > 0 ? ((totalLimits - totalCredits) / totalLimits) * 100 : 0;

  return (
    <div className="space-y-4 md:space-y-6 animate-fade-in">
      {/* Header */}
      <Card className="shadow-lg border-2 bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5">
        <CardHeader className="pb-4 md:pb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 bg-primary/10 text-primary rounded-xl p-2 md:p-3">
                <Crown className="h-6 w-6 md:h-8 md:w-8" />
              </div>
              <div>
                <CardTitle className="text-2xl md:text-3xl font-bold">
                  Planos e Uso
                </CardTitle>
                <p className="text-xs md:text-base text-muted-foreground mt-1">
                  Gerencie seu plano e recursos
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowPlansSelection(true)}
              className="w-full sm:w-auto"
            >
              <Crown className="h-4 w-4 mr-2" />
              Ver Todos os Planos
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Resumo do Plano Atual */}
      <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-2 border-primary/20">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-secondary text-secondary-foreground text-sm">
                  {plan?.displayName || 'Plano'}
                </Badge>
                <span className="text-sm font-medium text-foreground">Plano Atual</span>
              </div>
              <p className="text-xs md:text-sm text-muted-foreground">
                R$ {(plan?.price || 0).toFixed(2)}/mês • Você está usando o plano {plan?.displayName || 'atual'}
              </p>
            </div>
            <div className="text-left md:text-right">
              <p className="text-3xl md:text-4xl font-bold text-primary">{totalCredits}</p>
              <p className="text-xs md:text-sm text-muted-foreground">
                de {totalLimits.toLocaleString()} créditos
              </p>
              <Progress value={100 - usagePercentage} className="h-2 mt-2" />
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Grid de Créditos e Informações */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        {/* Coluna Principal - Créditos */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
            {creditData.map((credit, index) => {
              const usedCredits = Math.max(0, credit.limit - credit.current);
              const percentage = credit.limit > 0 ? (credit.current / credit.limit) * 100 : 0;
              const isLow = credit.current <= (credit.limit * 0.2);
              const isAtLimit = credit.current <= 0;
              const Icon = credit.icon;

              return (
                <Card 
                  key={index} 
                  className={`hover-scale transition-all ${
                    isAtLimit ? 'border-destructive/50' : 
                    isLow ? 'border-yellow-500/50' : 
                    'border-green-500/50'
                  }`}
                >
                  <CardHeader className="pb-2 md:pb-3">
                    <CardTitle className="text-xs md:text-sm font-medium flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg ${credit.bgColor}`}>
                        <Icon className={`h-3 w-3 md:h-4 md:w-4 ${credit.color}`} />
                      </div>
                      <span className="truncate">{credit.name}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-2xl md:text-3xl font-bold">{credit.current}</span>
                      <span className="text-xs text-muted-foreground">
                        / {credit.limit}
                      </span>
                    </div>
                    <Progress value={percentage} className="h-1.5 md:h-2" />
                    <p className={`text-xs ${
                      isAtLimit ? 'text-destructive' :
                      isLow ? 'text-yellow-600' :
                      'text-green-600'
                    }`}>
                      {isAtLimit ? 'Créditos esgotados' :
                       isLow ? 'Poucos créditos' :
                       'Disponível'}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Limites de Recursos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base md:text-lg">Limites de Recursos</CardTitle>
              <p className="text-xs md:text-sm text-muted-foreground">
                Recursos incluídos no seu plano
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { icon: Tag, label: 'Marcas', value: plan?.maxBrands || 0, color: 'text-primary', bg: 'bg-primary/5' },
                  { icon: Palette, label: 'Temas', value: plan?.maxStrategicThemes || 0, color: 'text-secondary', bg: 'bg-secondary/5' },
                  { icon: Users, label: 'Personas', value: plan?.maxPersonas || 0, color: 'text-green-600', bg: 'bg-green-500/5' },
                  { icon: UserCircle, label: 'Membros', value: plan?.maxMembers || 0, color: 'text-purple-600', bg: 'bg-purple-500/5' },
                ].map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <div key={idx} className={`flex items-center gap-2 p-3 rounded-lg ${item.bg}`}>
                      <div className="flex-shrink-0">
                        <Icon className={`h-4 w-4 md:h-5 md:w-5 ${item.color}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-xs md:text-sm truncate">{item.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.value >= 999999 ? 'Ilimitado' : `até ${item.value}`}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - Ações e Info */}
        <div className="space-y-4">
          {/* Ações Rápidas */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm md:text-base">Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { to: '/brands', icon: Tag, label: 'Gerenciar Marcas' },
                { to: '/themes', icon: Palette, label: 'Gerenciar Temas' },
                { to: '/personas', icon: Users, label: 'Gerenciar Personas' },
              ].map((action, idx) => {
                const Icon = action.icon;
                return (
                  <Link key={idx} to={action.to}>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="w-full justify-start hover:bg-secondary/50 text-xs md:text-sm"
                    >
                      <Icon className="h-3 w-3 md:h-4 md:w-4 mr-2" />
                      {action.label}
                    </Button>
                  </Link>
                );
              })}
            </CardContent>
          </Card>

          {/* Card do Plano */}
          <Card className="border-2 border-primary/20 bg-gradient-to-br from-background to-primary/5">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base md:text-lg">{plan?.displayName || 'Plano Atual'}</CardTitle>
                <Badge variant="secondary" className="text-xs">Ativo</Badge>
              </div>
              <div className="text-2xl md:text-3xl font-bold text-primary">
                R$ {(plan?.price || 0).toFixed(2)}
                <span className="text-sm font-normal text-muted-foreground ml-1">/mês</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: 'Todas as funcionalidades', included: true },
                { label: 'Suporte prioritário', included: (plan?.price || 0) > 0 },
                { label: 'Integrações avançadas', included: plan?.name === 'ENTERPRISE' },
              ].map((feature, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  {feature.included ? (
                    <CheckCircle className="h-3 w-3 md:h-4 md:w-4 text-green-600 flex-shrink-0" />
                  ) : (
                    <X className="h-3 w-3 md:h-4 md:w-4 text-muted-foreground flex-shrink-0" />
                  )}
                  <span className={`text-xs md:text-sm ${
                    feature.included ? '' : 'text-muted-foreground line-through'
                  }`}>
                    {feature.label}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Info da Equipe */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm md:text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Equipe
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs md:text-sm">
              <div>
                <p className="text-muted-foreground">Nome</p>
                <p className="font-medium">{team?.name || 'Equipe'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Admin</p>
                <p className="font-medium truncate">{team?.admin || 'Admin'}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Plans;
