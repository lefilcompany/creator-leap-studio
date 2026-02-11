import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
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
  Rocket,
  History
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TrialBanner } from "@/components/TrialBanner";
import { ExpiredTrialBlocker } from "@/components/ExpiredTrialBlocker";
import { useQuery } from "@tanstack/react-query";

import { dashboardSteps, navbarSteps } from '@/components/onboarding/tourSteps';
import { TourSelector } from '@/components/onboarding/TourSelector';

const Dashboard = () => {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('success') === 'true' && user) {
      toast.success(
        `🎉 Pagamento confirmado! Bem-vindo ao seu novo plano!`,
        {
          description: `Você tem ${user.credits || 0} créditos disponíveis. Comece a criar!`,
          duration: 5000,
        }
      );
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [user]);

  const { data: actionsCount = 0 } = useQuery({
    queryKey: ['dashboard-actions-count', user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('actions')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id);
      return count || 0;
    },
    enabled: !!user?.id,
  });

  const { data: brandsCount = 0 } = useQuery({
    queryKey: ['dashboard-brands-count', user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from('brands')
        .select('*', { count: 'exact', head: true });
      return count || 0;
    },
    enabled: !!user?.id,
  });

  const { data: recentActivities = [] } = useQuery({
    queryKey: ['dashboard-recent-activities', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('actions')
        .select(`id, type, status, created_at, brand_id, brands(name)`)
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(3);
      return data || [];
    },
    enabled: !!user?.id,
  });

  const { data: planCredits = 0 } = useQuery({
    queryKey: ['dashboard-plan-credits', user?.planId],
    queryFn: async () => {
      const { data } = await supabase
        .from('plans')
        .select('credits')
        .eq('id', user!.planId)
        .single();
      return data?.credits || 0;
    },
    enabled: !!user?.planId,
  });

  if (isLoading || !user) {
    return (
      <div className="space-y-6 pb-8">
        <Skeleton className="h-32 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Skeleton className="lg:col-span-2 h-44 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-32 rounded-xl" />
        </div>
        <Skeleton className="h-14 w-full rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="lg:col-span-2 h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  const totalCredits = planCredits || user.credits || 0;
  const remainingCredits = user.credits || 0;
  const progressPercentage = totalCredits > 0 ? ((remainingCredits / totalCredits) * 100) : 0;

  const quickActions = [
    { title: "Criar Conteúdo", description: "Gerar novas imagens e textos", icon: Sparkles, link: "/create" },
    { title: "Revisar Conteúdo", description: "Receber feedback da IA", icon: CheckCircle, link: "/review" },
    { title: "Gerenciar Personas", description: "Adicionar ou editar suas personas", icon: Users, link: "/personas" }
  ];

  const formatActionType = (type: string) => {
    const types: Record<string, string> = {
      'quick_content': 'Conteúdo Criado', 'content_suggestion': 'Sugestão de Conteúdo',
      'content_plan': 'Calendário Planejado', 'content_review': 'Conteúdo Revisado',
      'PLANEJAR_CONTEUDO': 'Planejar Conteúdo', 'CRIAR_CONTEUDO': 'Criar Conteúdo',
      'SUGERIR_CONTEUDO': 'Sugerir Conteúdo', 'REVISAR_CONTEUDO': 'Revisar Conteúdo'
    };
    if (types[type]) return types[type];
    return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  return (
    <div className="space-y-6 pb-8">
      <TourSelector 
        tours={[
          { tourType: 'navbar', steps: navbarSteps, label: 'Tour da Navegação', targetElement: '#sidebar-logo' },
          { tourType: 'dashboard', steps: dashboardSteps, label: 'Tour do Dashboard', targetElement: '#dashboard-credits-card' }
        ]}
        startDelay={1000}
      />
      
      <ExpiredTrialBlocker />
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
                <h1 className="text-3xl font-bold text-foreground mb-1">Olá, {user.name}!</h1>
                <p className="text-muted-foreground text-base">Bem-vindo(a) de volta ao seu painel de criação</p>
              </div>
            </div>
            <Link to="/create">
              <Button size="lg" className="rounded-full text-lg px-8 py-6 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl">
                <Plus className="mr-2 h-5 w-5" />
                Criar Novo Conteúdo
              </Button>
            </Link>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Grid */}
      <div id="dashboard-stats" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card id="dashboard-credits-card" className="lg:col-span-2 bg-card shadow-lg border-2 border-primary/20 hover:border-primary/30 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-medium text-primary">Créditos Restantes</CardTitle>
            <Rocket className="h-5 w-5 text-primary" />
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-4xl font-bold tracking-tight text-foreground mb-2">{remainingCredits.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground mb-4">de {totalCredits.toLocaleString()} créditos disponíveis</p>
            <Progress value={progressPercentage} className="h-3 bg-primary/20 mb-3" />
            <Link to="/plans">
              <Button variant="link" className="h-auto p-0 text-sm text-primary hover:text-primary/80 font-medium">
                Comprar mais créditos <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-lg border-2 border-transparent hover:border-secondary/20 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-medium">Minhas Ações</CardTitle>
            <Sparkles className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-4xl font-bold tracking-tight text-foreground mb-2">{actionsCount.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground">total de ações realizadas</p>
          </CardContent>
        </Card>

        <Card className="bg-card shadow-lg border-2 border-transparent hover:border-accent/20 transition-all duration-200">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-medium">Marcas Gerenciadas</CardTitle>
            <Tags className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="pb-4">
            <div className="text-4xl font-bold tracking-tight text-foreground mb-2">{brandsCount.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground">total de marcas ativas</p>
          </CardContent>
        </Card>
      </div>

      {/* Histórico Button */}
      <div className="mb-6">
        <Link to="/history">
          <Button variant="outline" className="w-full h-14 text-lg font-medium border-primary/20 hover:bg-primary/10 hover:border-primary/40 transition-all duration-300 group">
            <History className="mr-3 h-5 w-5 text-primary group-hover:scale-110 transition-transform" />
            Ver Histórico Completo
            <ArrowRight className="ml-auto h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
          </Button>
        </Link>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
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
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-50" />
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2">
          <Card id="dashboard-recent-actions" className="shadow-lg border-0 bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5 animate-fade-in">
            <CardHeader className="pb-4 border-b border-border/50">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 bg-primary/10 text-primary rounded-lg p-3">
                  <FileText className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl font-semibold">Atividades Recentes</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border/50">
                {recentActivities.length > 0 ? (
                  recentActivities.map((activity: any) => (
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
                        <p className="text-sm font-medium text-foreground mb-1">{formatDate(activity.created_at)}</p>
                        <Link to="/history">
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
                    <p className="text-muted-foreground text-lg font-medium">Nenhuma atividade recente encontrada</p>
                    <p className="text-sm text-muted-foreground mt-1">Suas atividades aparecerão aqui quando você começar a criar conteúdo</p>
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
