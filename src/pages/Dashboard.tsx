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
      value: "29739",
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
      color: "text-secondary"
    },
    {
      title: "Marcas Gerenciadas", 
      value: "16",
      subtitle: "total de marcas ativas",
      icon: Tags,
      color: "text-accent"
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
      title: "Conteúdo Criado",
      brand: "Para a marca Lumi",
      date: "25/09/2025",
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
    <div className="p-6 space-y-6 bg-gradient-subtle min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 bg-accent px-4 py-3 rounded-xl shadow-sm">
          <HomeIcon className="w-5 h-5 text-primary" />
          <div>
            <h1 className="text-xl font-semibold">Olá, Equipe Lima!</h1>
            <p className="text-sm text-muted-foreground">Bem-vindo(a) de volta ao seu painel de criação</p>
          </div>
        </div>
        
        <Button className="bg-creator-gradient text-white hover:opacity-90 px-6 rounded-xl shadow-sm">
          <Plus className="w-4 h-4 mr-2" />
          Criar Novo Conteúdo
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className={`shadow-sm border-0 ${index === 0 ? 'bg-gradient-card' : 'bg-card'} rounded-xl`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
              {stat.progress && (
                <div className="mt-3">
                  <Progress value={stat.progress} className="h-2" />
                  <Button variant="link" className="h-auto p-0 mt-2 text-xs text-primary">
                    Ver planos e uso <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card className="bg-accent shadow-sm border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Ações Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {quickActions.map((action, index) => (
              <div 
                key={index}
                className="flex items-center gap-3 p-3 rounded-xl bg-background border-0 hover:bg-muted/30 cursor-pointer transition-colors"
              >
                <action.icon className={`w-5 h-5 ${action.color}`} />
                <div className="flex-1">
                  <h3 className="font-medium">{action.title}</h3>
                  <p className="text-sm text-muted-foreground">{action.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card className="shadow-sm border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Atividades Recentes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex items-center justify-between border-b last:border-b-0 pb-3 last:pb-0">
                <div className="flex items-center gap-3">
                  <activity.icon className="w-4 h-4 text-muted-foreground" />
                  <div>
                    <h3 className="font-medium text-sm">{activity.title}</h3>
                    <p className="text-xs text-muted-foreground">{activity.brand}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">{activity.date}</p>
                  <Button variant="link" className="h-auto p-0 text-xs text-primary">
                    {activity.action}
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;