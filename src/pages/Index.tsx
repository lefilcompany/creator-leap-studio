import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CreatorLogo } from "@/components/CreatorLogo";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Sparkles, Zap, Target, TrendingUp } from "lucide-react";
import { useEffect } from "react";

const Index = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate("/dashboard");
    }
  }, [user, navigate]);

  const features = [
    {
      icon: <Sparkles className="w-8 h-8 text-primary" />,
      title: "Criação Inteligente",
      description: "Gere conteúdo de alta qualidade com IA em segundos"
    },
    {
      icon: <Zap className="w-8 h-8 text-primary" />,
      title: "Agilidade",
      description: "Planeje e crie conteúdo rapidamente para suas redes"
    },
    {
      icon: <Target className="w-8 h-8 text-primary" />,
      title: "Estratégia",
      description: "Defina personas, marcas e temas estratégicos"
    },
    {
      icon: <TrendingUp className="w-8 h-8 text-primary" />,
      title: "Resultados",
      description: "Acompanhe seu histórico e melhore continuamente"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <CreatorLogo />
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => navigate("/login")}>
              Login
            </Button>
            <Button onClick={() => navigate("/register")}>
              Começar Agora
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-20 text-center">
        <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
          <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent">
            Crie Conteúdo Incrível com IA
          </h1>
          <p className="text-xl text-muted-foreground">
            Transforme suas ideias em conteúdo estratégico para redes sociais. 
            Planeje, crie e revise com o poder da inteligência artificial.
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Button size="lg" onClick={() => navigate("/register")} className="text-lg px-8">
              Começar Gratuitamente
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/login")} className="text-lg px-8">
              Fazer Login
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, index) => (
            <Card 
              key={index} 
              className="border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
            >
              <CardHeader>
                <div className="mb-4">{feature.icon}</div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
                <CardDescription className="text-base">
                  {feature.description}
                </CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-20">
        <Card className="max-w-3xl mx-auto border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardHeader className="text-center space-y-4">
            <CardTitle className="text-3xl">
              Pronto para começar?
            </CardTitle>
            <CardDescription className="text-lg">
              Junte-se a criadores de conteúdo que já estão transformando suas estratégias digitais
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-8">
            <Button size="lg" onClick={() => navigate("/register")} className="text-lg px-12">
              Criar Conta Grátis
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
};

export default Index;
