import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { Zap, Sparkles, Calendar, CheckCircle, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const creditTypes = [
  {
    icon: Zap,
    title: "Criações Rápidas",
    gradient: "from-[hsl(331,100%,38%)] to-[hsl(308,41%,52%)]",
    description: "Gere posts completos em segundos! Imagem + legenda otimizada automaticamente. Perfeito para manter sua presença online constante sem esforço.",
    includes: [
      "Imagem gerada por IA",
      "Legenda estratégica",
      "Pronto para publicar"
    ]
  },
  {
    icon: Sparkles,
    title: "Criações Personalizadas",
    gradient: "from-[hsl(288,42%,60%)] to-[hsl(261,38%,60%)]",
    description: "Crie conteúdos sob medida para suas campanhas específicas. Você define o tema, persona e objetivo - nossa IA desenvolve estrategicamente.",
    includes: [
      "Alinhado à sua marca",
      "Baseado em personas",
      "Temas estratégicos",
      "Múltiplas plataformas"
    ]
  },
  {
    icon: Calendar,
    title: "Planejamento de Conteúdo",
    gradient: "from-[hsl(229,37%,57%)] to-[hsl(210,46%,49%)]",
    description: "Monte calendários editoriais completos. Receba um plano estratégico com temas, datas e diretrizes para semanas ou meses de conteúdo.",
    includes: [
      "Calendário estruturado",
      "Sugestões de pauta",
      "Melhor timing",
      "Consistência garantida"
    ]
  },
  {
    icon: CheckCircle,
    title: "Revisões de Conteúdo",
    gradient: "from-[hsl(200,72%,40%)] to-[hsl(200,49%,55%)]",
    description: "IA analisa seu conteúdo existente e sugere melhorias. Otimize legendas, ajuste imagens ou refine sua mensagem antes de publicar.",
    includes: [
      "Feedback instantâneo",
      "Otimização de texto",
      "Sugestões visuais",
      "Aumento de engajamento"
    ]
  }
];

export const CreditsExplanation = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <section className="py-20 lg:py-32 relative">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 space-y-4"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold">
            Entenda nossos{" "}
            <span className="bg-gradient-to-r from-[hsl(331,100%,38%)] to-[hsl(200,72%,40%)] bg-clip-text text-transparent">
              créditos mensais
            </span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Cada tipo de crédito é uma ferramenta poderosa para sua estratégia de conteúdo
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-6xl mx-auto mb-12">
          {creditTypes.map((credit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: index * 0.1, duration: 0.6 }}
              whileHover={{ y: -8, scale: 1.02 }}
              className="h-full"
            >
              <Card className="h-full relative border-2 border-primary/10 hover:border-primary/30 hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${credit.gradient} flex items-center justify-center mb-4 shadow-lg`}>
                    <credit.icon className="w-7 h-7 text-white" />
                  </div>
                  <CardTitle className="text-xl">{credit.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-muted-foreground leading-relaxed">
                    {credit.description}
                  </p>
                  <div className="space-y-2 pt-2 border-t border-primary/10">
                    {credit.includes.map((item, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
                        <span className="text-muted-foreground">{item}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="text-center"
        >
          <p className="text-muted-foreground text-lg">
            Escolha o plano com os créditos que você precisa{" "}
            <span className="inline-block animate-bounce">↓</span>
          </p>
        </motion.div>
      </div>
    </section>
  );
};
