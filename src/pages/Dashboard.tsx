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
            <Zap className="h-5 w-5 text-muted-foreground" />
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
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-purple-100 rounded-xl p-6 border border-purple-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-purple-200 rounded-lg p-2">
              <Sparkles className="w-5 h-5 text-purple-700" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">Ações Rápidas</h2>
          </div>
          
          <div className="space-y-3">
            {quickActions.map((action, index) => (
              <div 
                key={index}
                className="bg-white rounded-xl p-4 border border-purple-200 hover:border-purple-300 cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <action.icon className="w-5 h-5 text-blue-500" />
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-800">{action.title}</h3>
                    <p className="text-sm text-gray-500">{action.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activities */}
        <div className="bg-pink-100 rounded-xl p-6 border border-pink-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-pink-200 rounded-lg p-2">
              <FileText className="w-5 h-5 text-pink-700" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">Atividades Recentes</h2>
          </div>
          
          <div className="space-y-0">
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex items-center justify-between py-4 border-b border-pink-300 last:border-b-0">
                <div className="flex items-center gap-3">
                  <div className="bg-gray-100 rounded-lg p-2">
                    <activity.icon className="w-4 h-4 text-gray-500" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-800">{activity.title}</h3>
                    <p className="text-sm text-gray-500">{activity.brand}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600 mb-1">{activity.date}</p>
                  <button className="text-sm text-purple-600 hover:text-purple-700 font-medium">
                    {activity.action}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;