import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
  Rocket
} from "lucide-react";

const Dashboard = () => {
  const stats = [
    {
      title: "Créditos Restantes",
      value: "29736",
      subtitle: "de 30000 créditos disponíveis",
      icon: Rocket,
      color: "text-primary",
      progress: 99.1
    },
    {
      title: "Minhas Ações",
      value: "54",
      subtitle: "total de ações realizadas",
      icon: Zap,
      color: "text-muted-foreground"
    },
    {
      title: "Marcas Gerenciadas", 
      value: "16",
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
      color: "text-primary"
    },
    {
      title: "Revisar Imagem", 
      description: "Receber feedback da IA",
      icon: CheckCircle,
      color: "text-secondary"
    },
    {
      title: "Gerenciar Personas",
      description: "Adicionar ou editar suas personas",
      icon: Users,
      color: "text-accent"
    }
  ];

  const recentActivities = [
    {
      title: "Calendário Planejado",
      brand: "Planejamento para LeFil Company",
      date: "24/09/2025",
      action: "Ver detalhes",
      icon: FileText
    },
    {
      title: "Conteúdo Criado", 
      brand: "Para a marca Cerâmica Brennand",
      date: "18/09/2025",
      action: "Ver detalhes",
      icon: FileText
    },
    {
      title: "Conteúdo Criado",
      brand: "Para a marca Iclub", 
      date: "18/09/2025",
      action: "Ver detalhes",
      icon: FileText
    }
  ];

  return (
    <div className="p-6 space-y-6">
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
                  Olá, Equipe Lima!
                </h1>
                <p className="text-muted-foreground text-base">
                  Bem-vindo(a) de volta ao seu painel de criação
                </p>
              </div>
            </div>
            
            <Button 
              size="lg" 
              className="rounded-full text-lg px-8 py-6 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <Plus className="mr-2 h-5 w-5" />
              Criar Novo Conteúdo
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Créditos Card - Destaque com 2 colunas */}
        <Card className="lg:col-span-2 bg-card shadow-lg border-2 border-primary/20 hover:border-primary/30 transition-all duration-200">
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
            <Button variant="link" className="h-auto p-0 text-sm text-primary hover:text-primary/80 font-medium">
              Ver planos e uso <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
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

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <Card className="shadow-lg border-0 bg-gradient-to-r from-secondary/5 via-primary/5 to-secondary/5 animate-fade-in">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 bg-secondary/10 text-secondary rounded-lg p-3">
                  <Sparkles className="h-6 w-6" />
                </div>
                <CardTitle className="text-xl font-semibold">Ações Rápidas</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {quickActions.map((action, index) => (
                <Card key={index} className="hover:bg-muted/50 hover:shadow-md transition-all duration-200 cursor-pointer hover-scale">
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
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activities */}
        <div className="lg:col-span-2">
          <Card className="shadow-lg border-0 bg-gradient-to-r from-primary/5 via-secondary/5 to-primary/5 animate-fade-in">
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
                {recentActivities.length > 0 ? (
                  recentActivities.map((activity, index) => (
                    <div key={index} className="flex items-center justify-between p-6 hover:bg-muted/30 transition-all duration-200 group">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-muted to-muted/50 rounded-lg shadow-sm">
                          <activity.icon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {activity.title}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {activity.brand}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-foreground mb-1">
                          {activity.date}
                        </p>
                        <button className="text-sm text-primary hover:text-primary/80 font-medium hover:underline transition-all">
                          {activity.action}
                        </button>
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