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
      value: "29740",
      subtitle: "de 30000 créditos disponíveis",
      icon: Rocket,
      color: "text-primary",
      progress: 99.1
    },
    {
      title: "Minhas Ações",
      value: "53",
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 bg-primary/5 px-4 py-3 rounded-lg border border-primary/10">
          <HomeIcon className="w-5 h-5 text-primary" />
          <div>
            <h1 className="text-xl font-semibold">Olá, Equipe Lima!</h1>
            <p className="text-sm text-muted-foreground">Bem-vindo(a) de volta ao seu painel de criação</p>
          </div>
        </div>
        
        <Button className="bg-primary text-primary-foreground hover:bg-primary/90 px-6">
          <Plus className="w-4 h-4 mr-2" />
          Criar Novo Conteúdo
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <Card key={index} className={`border ${index === 0 ? 'border-primary/20 bg-primary/5' : 'border-border'}`}>
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
        <div className="bg-pink-50 rounded-xl p-6 border border-pink-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-pink-100 rounded-full p-2">
              <FileText className="w-5 h-5 text-pink-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800">Atividades Recentes</h2>
          </div>
          
          <div className="space-y-4">
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex items-center justify-between py-3 border-b border-pink-100 last:border-b-0">
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