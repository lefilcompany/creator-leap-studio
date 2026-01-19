import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import { 
  Home as HomeIcon,
  Plus,
  Sparkles,
  CheckCircle,
  Users,
  ArrowRight,
  FileText,
  Zap,
  Tags,
  Tag,
  Rocket,
  Loader2,
  History
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TrialBanner } from "@/components/TrialBanner";
import { ExpiredTrialBlocker } from "@/components/ExpiredTrialBlocker";

import { OnboardingTour } from '@/components/onboarding/OnboardingTour';
import { dashboardSteps, navbarSteps } from '@/components/onboarding/tourSteps';
import { TourSelector } from '@/components/onboarding/TourSelector';

const Dashboard = () => {
  const { user, team, isLoading } = useAuth();
  const [dashboardData, setDashboardData] = useState({
    totalActions: 0,
    totalBrands: 0,
    recentActivities: [] as any[]
  });
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const [planCredits, setPlanCredits] = useState(0);

  useEffect(() => {
    // Verificar se veio do pagamento bem-sucedido
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('success') === 'true' && user) {
      toast.success(
        `🎉 Pagamento confirmado! Bem-vindo ao seu novo plano!`,
        {
          description: `Você tem ${user.credits || 0} créditos disponíveis. Comece a criar!`,
          duration: 5000,
        }
      );
      
      // Limpar query parameter
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [user]);

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (!user || isDataLoaded) return;

      try {
        // Buscar total de ações do usuário logado (usando RLS can_access_resource)
        const { count: actionsCount } = await supabase
          .from('actions')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        // Buscar total de marcas acessíveis (usando RLS can_access_resource)
        const { count: brandsCount } = await supabase
          .from('brands')
          .select('*', { count: 'exact', head: true });

        // Buscar atividades recentes (últimas 3 ações do usuário)
        const { data: recentActions } = await supabase
          .from('actions')
          .select(`
            id,
            type,
            status,
            created_at,
            brand_id,
            brands(name)
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(3);

        // Buscar créditos do plano do usuário
        if (user.planId) {
          const { data: planData } = await supabase
            .from('plans')
            .select('credits')
            .eq('id', user.planId)
            .single();
          
          if (planData && isMounted) {
            setPlanCredits(planData.credits || 0);
          }
        }

        if (isMounted) {
          setDashboardData({
            totalActions: actionsCount || 0,
            totalBrands: brandsCount || 0,
            recentActivities: recentActions || []
          });
          setIsDataLoaded(true);
        }
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
        toast.error('Erro ao carregar dados do dashboard');
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [user, isDataLoaded]);

  if (isLoading || !user || !isDataLoaded) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Calcular créditos - usando créditos individuais do usuário
  const totalCredits = planCredits || user.credits || 0;
  const remainingCredits = user.credits || 0;
  const progressPercentage = totalCredits > 0 ? ((remainingCredits / totalCredits) * 100) : 0;

  const stats = [
    {
      title: "Créditos Restantes",
      value: remainingCredits.toLocaleString(),
      subtitle: `de ${totalCredits.toLocaleString()} créditos disponíveis`,
      icon: Rocket,
      color: "text-primary",
      progress: progressPercentage
    },
    {
      title: "Minhas Ações",
      value: dashboardData.totalActions.toString(),
      subtitle: "total de ações realizadas",
      icon: Zap,
      color: "text-muted-foreground"
    },
    {
      title: "Marcas Gerenciadas", 
      value: dashboardData.totalBrands.toString(),
      subtitle: "total de marcas ativas",
      icon: Tags,
      color: "text-muted-foreground"
    }
  ];

  const quickActions = [
    {
      title: "Criar Conteúdo",
      description: "Gerar novas imagens e textos",
      icon: Sparkles,
      color: "text-primary",
      link: "/create"
    },
    {
      title: "Revisar Conteúdo", 
      description: "Receber feedback da IA",
      icon: CheckCircle,
      color: "text-secondary",
      link: "/review"
    },
    {
      title: "Gerenciar Personas",
      description: "Adicionar ou editar suas personas",
      icon: Users,
      color: "text-accent",
      link: "/personas"
    }
  ];

  const formatActionType = (type: string) => {
    const types: Record<string, string> = {
      'quick_content': 'Conteúdo Criado',
      'content_suggestion': 'Sugestão de Conteúdo',
      'content_plan': 'Calendário Planejado',
      'content_review': 'Conteúdo Revisado',
      'PLANEJAR_CONTEUDO': 'Planejar Conteúdo',
      'CRIAR_CONTEUDO': 'Criar Conteúdo',
      'SUGERIR_CONTEUDO': 'Sugerir Conteúdo',
      'REVISAR_CONTEUDO': 'Revisar Conteúdo'
    };
    
    // Se encontrar no mapeamento, retorna
    if (types[type]) return types[type];
    
    // Caso contrário, converte SNAKE_CASE para Título Formatado
    return type
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    });
  };

  return (
    <div className="space-y-6 pb-8">
      <TourSelector 
        tours={[
          {
            tourType: 'navbar',
            steps: navbarSteps,
            label: 'Tour da Navegação',
            targetElement: '#sidebar-logo'
          },
          {
            tourType: 'dashboard',
            steps: dashboardSteps,
            label: 'Tour do Dashboard',
            targetElement: '#dashboard-credits-card'
          }
        ]}
        startDelay={1000}
      />
      
      {/* Bloqueador de Trial Expirado */}
      <ExpiredTrialBlocker />
      
      {/* Banner de Trial */}
      <TrialBanner />
      
      {/* Header */}
      <Card className="shadow-lg border-0 bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5 animate-fade-in">
        <CardHeader className="pb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 bg-gradient-to-br from-primary/20 to-primary/10 text-primary rounded-xl p-4 shadow-md">
                <HomeIcon className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-1">
                  Olá, {user.name}!
                </h1>
                <p className="text-muted-foreground text-base">
                  Bem-vindo(a) de volta ao seu painel de criação
                </p>
              </div>
            </div>
            
            <Link to="/create">
              <Button 
                size="lg" 
                className="rounded-full text-lg px-8 py-6 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <Plus className="mr-2 h-5 w-5" />
                Criar Novo Conteúdo
              </Button>
            </Link>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Grid */}
      <div id="dashboard-stats" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Créditos Card - Destaque com 2 colunas */}
        <Card id="dashboard-credits-card" className="lg:col-span-2 bg-card shadow-lg border-2 border-primary/20 hover:border-primary/30 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-medium text-primary">
              {stats[0].title}
            </CardTitle>
            <Rocket className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-4xl font-bold tracking-tight text-foreground mb-2">{stats[0].value}</div>
            <p className="text-sm text-muted-foreground mb-4">{stats[0].subtitle}</p>
            <Progress value={stats[0].progress} className="h-3 bg-primary/20 mb-3" />
            <Link to="/plans">
              <Button variant="link" className="h-auto p-0 text-sm text-primary hover:text-primary/80 font-medium">
                Ver planos e uso <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {/* Minhas Ações Card */}
        <Card className="bg-card shadow-lg border-2 border-transparent hover:border-secondary/20 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-medium">
              {stats[1].title}
            </CardTitle>
            <Sparkles className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-4xl font-bold tracking-tight text-foreground mb-2">{stats[1].value}</div>
            <p className="text-sm text-muted-foreground">{stats[1].subtitle}</p>
          </CardContent>
        </Card>

        {/* Marcas Gerenciadas Card */}
        <Card className="bg-card shadow-lg border-2 border-transparent hover:border-accent/20 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-medium">
              {stats[2].title}
            </CardTitle>
            <Tags className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-4xl font-bold tracking-tight text-foreground mb-2">{stats[2].value}</div>
            <p className="text-sm text-muted-foreground">{stats[2].subtitle}</p>
          </CardContent>
        </Card>
      </div>

      {/* Histórico Button */}
      <div className="mb-6">
        <Link to="/history">
          <Button 
            variant="outline" 
            className="w-full h-14 text-lg font-medium border-primary/20 hover:bg-primary/10 hover:border-primary/40 transition-all duration-300 group"
          >
            <History className="mr-3 h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
            Ver Histórico Completo
            <ArrowRight className="ml-auto h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </Button>
        </Link>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <Card id="dashboard-quick-actions" className="shadow-lg border-0 bg-gradient-to-r from-secondary/5 via-primary/5 to-secondary/5 animate-fade-in">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0 bg-secondary/10 text-secondary rounded-lg p-3">
                  <Sparkles className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl font-semibold">Ações Rápidas</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-6">
              {quickActions.map((action, index) => (
                <Link key={index} to={action.link}>
                  <Card className="hover:bg-muted/50 hover:shadow-md transition-all duration-200 cursor-pointer hover-scale">
                    <CardContent className="p-4 flex items-center gap-6">
                      <div className="flex-shrink-0 bg-accent/10 text-accent rounded-lg p-2">
                        <action.icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">{action.title}</p>
                        <p className="text-xs text-muted-foreground">{action.description}</p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-50 group-hover:opacity-100 transition-opacity" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activities */}
        <div className="lg:col-span-2">
          <Card id="dashboard-recent-actions" className="shadow-lg border-0 bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5 animate-fade-in">
            <CardHeader className="pb-4 border-b border-border/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex-shrink-0 bg-primary/10 text-primary rounded-lg p-3">
                    <FileText className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-xl font-semibold">Atividades Recentes</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                  {dashboardData.recentActivities.length > 0 ? (
                    dashboardData.recentActivities.map((activity, index) => (
                      <div key={activity.id} className="flex items-center justify-between p-6 hover:bg-muted/30 transition-all duration-200 group">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-gradient-to-br from-muted to-muted/50 rounded-lg shadow-sm">
                            <FileText className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                              {formatActionType(activity.type)}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {activity.brands?.name ? `Para a marca ${activity.brands.name}` : 'Sem marca associada'}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-foreground mb-1">
                            {formatDate(activity.created_at)}
                          </p>
                          <Link to={`/history`}>
                            <button className="text-sm text-primary hover:text-primary/80 font-medium hover:underline transition-all">
                              Ver detalhes
                            </button>
                          </Link>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-12 text-center">
                      <div className="bg-muted/50 rounded-full p-4 w-16 h-16 mx-auto mb-4">
                        <FileText className="h-8 w-8 text-muted-foreground mx-auto" />
                      </div>
                      <p className="text-muted-foreground text-lg font-medium">
                        Nenhuma atividade recente encontrada
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Suas atividades aparecerão aqui quando você começar a criar conteúdo
                      </p>
                    </div>
                  )}
                </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;