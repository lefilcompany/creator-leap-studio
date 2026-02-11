import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { 
  Sparkles,
  CheckCircle,
  CalendarDays,
  Video,
  ArrowRight,
  Zap,
  BarChart3,
  Tags,
  Bot,
  History,
  Wand2
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TrialBanner } from "@/components/TrialBanner";
import { ExpiredTrialBlocker } from "@/components/ExpiredTrialBlocker";
import { useQuery } from "@tanstack/react-query";
import { CREDIT_COSTS } from "@/lib/creditCosts";

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
        .limit(5);
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
        <Skeleton className="h-40 w-full rounded-2xl" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bom dia" : hour < 18 ? "Boa tarde" : "Boa noite";
  const firstName = user.name?.split(' ')[0] || 'Criador';

  const totalCredits = planCredits || user.credits || 0;
  const remainingCredits = user.credits || 0;
  const progressPercentage = totalCredits > 0 ? ((remainingCredits / totalCredits) * 100) : 0;

  const actionCards = [
    {
      title: "Criar Conteúdo",
      description: "Gere imagens e textos com IA para suas redes",
      icon: Sparkles,
      link: "/create",
      cost: CREDIT_COSTS.QUICK_IMAGE,
      gradient: "from-primary/20 to-primary/5",
      iconBg: "bg-primary/15 text-primary",
    },
    {
      title: "Revisar Conteúdo",
      description: "Receba feedback inteligente da IA sobre seus conteúdos",
      icon: CheckCircle,
      link: "/review",
      cost: CREDIT_COSTS.CAPTION_REVIEW,
      gradient: "from-accent/20 to-accent/5",
      iconBg: "bg-accent/15 text-accent",
    },
    {
      title: "Planejar Conteúdo",
      description: "Crie calendários editoriais estratégicos com IA",
      icon: CalendarDays,
      link: "/plan",
      cost: CREDIT_COSTS.CONTENT_PLAN,
      gradient: "from-secondary/20 to-secondary/5",
      iconBg: "bg-secondary/15 text-secondary-foreground",
    },
    {
      title: "Gerar Vídeo",
      description: "Transforme suas ideias em vídeos com inteligência artificial",
      icon: Video,
      link: "/create/video",
      cost: CREDIT_COSTS.VIDEO_GENERATION,
      gradient: "from-purple-500/20 to-purple-500/5",
      iconBg: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
    },
  ];

  const formatActionType = (type: string) => {
    const types: Record<string, string> = {
      'quick_content': 'Conteúdo Criado', 'content_suggestion': 'Sugestão de Conteúdo',
      'content_plan': 'Calendário Planejado', 'content_review': 'Conteúdo Revisado',
      'PLANEJAR_CONTEUDO': 'Planejar Conteúdo', 'CRIAR_CONTEUDO': 'Criar Conteúdo',
      'CRIAR_CONTEUDO_RAPIDO': 'Conteúdo Rápido', 'GERAR_VIDEO': 'Gerar Vídeo',
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

      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 p-6 md:p-8 animate-fade-in">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-accent/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-5">
          <div className="flex items-start gap-4">
            <div className="hidden sm:flex flex-shrink-0 bg-primary/10 rounded-2xl p-3.5">
              <Bot className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">
                {greeting}, {firstName}! ✨
              </h1>
              <p className="text-muted-foreground mt-1 text-sm md:text-base max-w-md">
                Sua IA criativa está pronta. O que vamos criar hoje?
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <Badge variant="secondary" className="text-sm px-3 py-1.5 font-semibold whitespace-nowrap">
              <Zap className="h-3.5 w-3.5 mr-1.5" />
              {remainingCredits} créditos
            </Badge>
            <Link to="/create" className="flex-1 md:flex-none">
              <Button size="lg" className="w-full md:w-auto rounded-xl text-base px-6 bg-primary hover:bg-primary/90 transition-all duration-300 hover:scale-105 shadow-lg hover:shadow-xl gap-2">
                <Wand2 className="h-5 w-5" />
                Criar com IA
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {actionCards.map((action, index) => (
          <Link key={index} to={action.link} className="group">
            <Card className={`relative overflow-hidden border-0 shadow-md bg-gradient-to-br ${action.gradient} h-full transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-pointer`}>
              <CardContent className="p-5 flex flex-col gap-3.5">
                <div className="flex items-center justify-between">
                  <div className={`rounded-xl p-2.5 ${action.iconBg}`}>
                    <action.icon className="h-6 w-6" />
                  </div>
                  <Badge variant="outline" className="text-xs font-medium bg-background/60 backdrop-blur-sm">
                    {action.cost} créditos
                  </Badge>
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm">{action.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{action.description}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-1 transition-all duration-300 mt-auto" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Metrics Bar */}
      <div id="dashboard-stats" className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card id="dashboard-credits-card" className="border shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="rounded-xl bg-primary/10 p-2.5 flex-shrink-0">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground font-medium">Créditos Restantes</p>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold text-foreground">{remainingCredits.toLocaleString()}</span>
                <span className="text-xs text-muted-foreground">/ {totalCredits.toLocaleString()}</span>
              </div>
              <Progress value={progressPercentage} className="h-1.5 mt-1.5 bg-primary/10" />
            </div>
            <Link to="/plans">
              <Button variant="ghost" size="sm" className="text-xs text-primary hover:text-primary/80 p-1">
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="border shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="rounded-xl bg-accent/10 p-2.5 flex-shrink-0">
              <BarChart3 className="h-5 w-5 text-accent-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground font-medium">Conteúdos Criados</p>
              <span className="text-xl font-bold text-foreground">{actionsCount.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border shadow-sm hover:shadow-md transition-shadow duration-200">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="rounded-xl bg-secondary/30 p-2.5 flex-shrink-0">
              <Tags className="h-5 w-5 text-secondary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground font-medium">Marcas Ativas</p>
              <span className="text-xl font-bold text-foreground">{brandsCount.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities */}
      <Card id="dashboard-recent-actions" className="border shadow-sm animate-fade-in">
        <CardContent className="p-0">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/50">
            <div className="flex items-center gap-2.5">
              <History className="h-5 w-5 text-muted-foreground" />
              <h2 className="font-semibold text-foreground text-base">Atividades Recentes</h2>
            </div>
            <Link to="/history">
              <Button variant="ghost" size="sm" className="text-xs text-primary hover:text-primary/80 gap-1">
                Ver tudo <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>

          <div className="divide-y divide-border/40">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity: any) => (
                <div key={activity.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="p-2 bg-muted/50 rounded-lg flex-shrink-0">
                      <Sparkles className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-foreground text-sm truncate">
                        {formatActionType(activity.type)}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {activity.brands?.name || 'Sem marca'}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-3">{formatDate(activity.created_at)}</span>
                </div>
              ))
            ) : (
              <div className="py-12 text-center">
                <div className="bg-muted/30 rounded-full p-4 w-14 h-14 mx-auto mb-3 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground font-medium text-sm">Nenhuma atividade ainda</p>
                <p className="text-xs text-muted-foreground mt-1">Comece criando seu primeiro conteúdo com IA!</p>
                <Link to="/create">
                  <Button variant="outline" size="sm" className="mt-4 gap-1.5">
                    <Wand2 className="h-4 w-4" /> Criar agora
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;
