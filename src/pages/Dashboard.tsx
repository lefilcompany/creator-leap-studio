import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { 
  Bell, 
  Settings, 
  Search, 
  User,
  Home as HomeIcon,
  Plus,
  Sparkles,
  CheckCircle,
  Users,
  ArrowRight,
  Calendar,
  Activity
} from "lucide-react";

const Dashboard = () => {
  const stats = [
    {
      title: "Créditos Restantes",
      value: "29742",
      subtitle: "de 30000 créditos disponíveis",
      icon: Sparkles,
      color: "text-pink-600",
      progress: 99
    },
    {
      title: "Minhas Ações",
      value: "53",
      subtitle: "total de ações realizadas",
      icon: Activity,
      color: "text-blue-600"
    },
    {
      title: "Marcas Gerenciadas", 
      value: "17",
      subtitle: "total de marcas ativas",
      icon: Users,
      color: "text-purple-600"
    }
  ];

  const quickActions = [
    {
      title: "Criar Conteúdo",
      description: "Gerar novas imagens e textos",
      icon: Plus,
      color: "bg-blue-500"
    },
    {
      title: "Revisar Imagem", 
      description: "Receber feedback da IA",
      icon: CheckCircle,
      color: "bg-teal-500"
    },
    {
      title: "Gerenciar Personas",
      description: "Adicionar ou editar suas personas",
      icon: Users,
      color: "bg-purple-500"
    }
  ];

  const recentActivities = [
    {
      title: "Calendário Planejado",
      brand: "LeFil Company",
      date: "24/09/2025",
      action: "Ver detalhes"
    },
    {
      title: "Conteúdo Criado", 
      brand: "Para a marca Cerâmica Brennand",
      date: "18/09/2025",
      action: "Ver detalhes"
    },
    {
      title: "Conteúdo Criado",
      brand: "Para a marca Iclub", 
      date: "18/09/2025",
      action: "Ver detalhes"
    }
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 bg-pink-50 px-4 py-3 rounded-lg">
          <HomeIcon className="w-5 h-5 text-pink-600" />
          <div>
            <h1 className="text-xl font-semibold">Olá, Equipe Lima!</h1>
            <p className="text-sm text-muted-foreground">Bem-vindo(a) de volta ao seu painel de criação</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input 
              placeholder="Pesquisar marcas, temas, personas..." 
              className="pl-10 pr-4 w-80"
            />
          </div>
          <Button size="sm" variant="outline" className="h-10 w-10 p-0">
            <Bell className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" className="h-10 w-10 p-0">
            <Settings className="w-4 h-4" />
          </Button>
          <Button className="creator-button-primary h-10">
            <Plus className="w-4 h-4 mr-2" />
            Criar Novo Conteúdo
          </Button>
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold">
            <User className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className="creator-card">
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
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div 
                      className="bg-primary h-1.5 rounded-full" 
                      style={{ width: `${stat.progress}%` }}
                    ></div>
                  </div>
                  <Button variant="link" className="h-auto p-0 mt-2 text-xs">
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
        <Card className="creator-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              Ações Rápidas
            </CardTitle>
            <CardDescription>Acesse as funcionalidades principais</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {quickActions.map((action, index) => (
              <div 
                key={index}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:border-gray-200 cursor-pointer transition-colors"
              >
                <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center text-white`}>
                  <action.icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium">{action.title}</h3>
                  <p className="text-sm text-muted-foreground">{action.description}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-muted-foreground" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card className="creator-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-pink-600" />
              Atividades Recentes
            </CardTitle>
            <CardDescription>Acompanhe suas últimas ações no sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex items-start justify-between p-3 rounded-lg bg-gray-50">
                <div className="flex-1">
                  <h3 className="font-medium text-sm">{activity.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{activity.brand}</p>
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