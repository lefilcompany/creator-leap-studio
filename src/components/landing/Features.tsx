import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import {
  Building2,
  Users,
  Sparkles,
  Calendar,
  CheckCircle,
  UsersRound,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: Building2,
    title: "Organize por Marcas e Temas",
    description:
      "Estruture sua comunicação de forma clara e integrada. Gerencie múltiplas marcas e temas estratégicos em um só lugar",
    delay: 0.1,
  },
  {
    icon: Users,
    title: "Personas que Convertem",
    description:
      "Crie conteúdos personalizados para cada público-alvo. Nossa IA entende as nuances de cada persona",
    delay: 0.2,
  },
  {
    icon: Sparkles,
    title: "Crie Imagens, Textos e Vídeos",
    description:
      "Gere conteúdo visual e textual de alta qualidade. Imagens personalizadas, legendas envolventes e vídeos dinâmicos",
    delay: 0.3,
  },
  {
    icon: Calendar,
    title: "Calendários Completos",
    description:
      "Planeje campanhas inteiras, não apenas posts isolados. Mantenha consistência e estratégia",
    delay: 0.4,
  },
  {
    icon: CheckCircle,
    title: "Feedback Instantâneo da IA",
    description:
      "Revise e otimize seu conteúdo antes de publicar. Sugestões inteligentes para melhorar performance",
    delay: 0.5,
  },
  {
    icon: UsersRound,
    title: "Colaboração em Tempo Real",
    description:
      "Gerencie equipes, atribua permissões e trabalhe em conjunto de forma eficiente",
    delay: 0.6,
  },
];

export const Features = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <section id="features" className="py-20 lg:py-32 relative">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 space-y-4"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold">
            Funcionalidades que{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              transformam
            </span>{" "}
            sua criação
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Tudo que você precisa para criar conteúdo estratégico com
            velocidade e qualidade profissional
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              feature={feature}
              index={index}
              inView={inView}
            />
          ))}
        </div>
      </div>
    </section>
  );
};

const FeatureCard = ({
  feature,
  index,
  inView,
}: {
  feature: (typeof features)[0];
  index: number;
  inView: boolean;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ delay: feature.delay, duration: 0.6 }}
      whileHover={{ y: -5 }}
      className="h-full"
    >
      <Card className="h-full border-2 border-primary/10 hover:border-primary/30 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 group">
        <CardHeader>
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
            <feature.icon className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-xl">{feature.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-base">
            {feature.description}
          </CardDescription>
        </CardContent>
      </Card>
    </motion.div>
  );
};
