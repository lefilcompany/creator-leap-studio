import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

const plans = [
  {
    name: "Light Plan",
    price: "Grátis",
    period: "7 dias de trial",
    description: "Experimente todas as funcionalidades",
    badge: null,
    features: [
      "1 marca ativa",
      "3 personas",
      "5 temas estratégicos",
      "10 Criações Rápidas/mês",
      "10 Criações Personalizadas/mês",
      "3 Planejamentos de Conteúdo/mês",
      "5 Revisões de Conteúdo/mês",
      "1 crédito de vídeo/mês",
      "Suporte por email",
    ],
    cta: "Começar Grátis",
    popular: false,
  },
  {
    name: "Básico",
    price: "R$ 97",
    period: "/mês",
    description: "Para criadores individuais",
    badge: "Popular",
    features: [
      "3 marcas ativas",
      "10 personas",
      "Temas estratégicos ilimitados",
      "50 Criações Rápidas/mês",
      "50 Criações Personalizadas/mês",
      "20 Planejamentos de Conteúdo/mês",
      "30 Revisões de Conteúdo/mês",
      "2 créditos de vídeo/mês",
      "Histórico completo",
      "Suporte prioritário",
    ],
    cta: "Começar Trial",
    popular: true,
  },
  {
    name: "Pro",
    price: "R$ 197",
    period: "/mês",
    description: "Para equipes e agências",
    badge: "Recomendado",
    features: [
      "Marcas ilimitadas",
      "Personas ilimitadas",
      "Temas estratégicos ilimitados",
      "150 Criações Rápidas/mês",
      "150 Criações Personalizadas/mês",
      "50 Planejamentos de Conteúdo/mês",
      "100 Revisões de Conteúdo/mês",
      "5 créditos de vídeo/mês",
      "Gestão de equipe (até 15 membros)",
      "Permissões granulares",
      "Suporte 24/7",
    ],
    cta: "Começar Trial",
    popular: false,
  },
  {
    name: "Enterprise",
    price: "Sob consulta",
    period: "",
    description: "Solução dimensionada para sua operação",
    badge: null,
    features: [
      "Recursos sob medida",
      "Marcas, personas e temas conforme necessário",
      "Volume de créditos personalizado",
      "Créditos de vídeo adaptados ao uso",
      "Integrações customizadas",
      "Treinamento dedicado da equipe",
      "Account Manager exclusivo",
      "SLA garantido",
      "Suporte prioritário 24/7",
    ],
    cta: "Falar com Vendas",
    popular: false,
  },
];

export const Pricing = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });
  const navigate = useNavigate();

  const handleCTA = (planName: string) => {
    if (planName === "Enterprise") {
      const element = document.getElementById("footer");
      element?.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate("/register");
    }
  };

  return (
    <section id="pricing" className="py-20 lg:py-32 relative">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 space-y-4"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold">
            Planos para{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              todos os tamanhos
            </span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Escolha o plano ideal para suas necessidades e comece a criar
            conteúdo estratégico hoje
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 max-w-7xl mx-auto">
          {plans.map((plan, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: index * 0.1, duration: 0.6 }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="h-full"
            >
              <Card
                className={`h-full relative border-2 transition-all duration-300 ${
                  plan.popular
                    ? "border-primary shadow-lg shadow-primary/20"
                    : "border-primary/10 hover:border-primary/30 hover:shadow-lg"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-3 py-1">
                      {plan.badge}
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center space-y-4 pb-8">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="space-y-2">
                    <div className="flex items-end justify-center gap-1">
                      <span className="text-4xl font-bold">{plan.price}</span>
                      {plan.period && (
                        <span className="text-muted-foreground mb-1">
                          {plan.period}
                        </span>
                      )}
                    </div>
                    <CardDescription>{plan.description}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Button
                    className="w-full"
                    variant={plan.popular ? "default" : "outline"}
                    onClick={() => handleCTA(plan.name)}
                  >
                    {plan.cta}
                  </Button>
                  <ul className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <li
                        key={featureIndex}
                        className="flex items-start gap-3 text-sm"
                      >
                        <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                        <span className="text-muted-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
