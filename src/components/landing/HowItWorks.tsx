import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import { Settings, Sparkles, CheckCircle, Share2 } from "lucide-react";

const steps = [
  {
    icon: Settings,
    title: "Configure",
    description: "Adicione suas marcas, temas estratégicos e personas",
    number: "01",
  },
  {
    icon: Sparkles,
    title: "Crie",
    description: "Gere conteúdo estratégico com IA em segundos",
    number: "02",
  },
  {
    icon: CheckCircle,
    title: "Revise",
    description: "Receba feedback inteligente e otimize seu conteúdo",
    number: "03",
  },
  {
    icon: Share2,
    title: "Publique",
    description: "Exporte e compartilhe em suas plataformas",
    number: "04",
  },
];

export const HowItWorks = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <section id="how-it-works" className="py-20 lg:py-32 relative bg-muted/30">
      <div className="container mx-auto px-4 lg:px-8">
        <motion.div
          ref={ref}
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16 space-y-4"
        >
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold">
            Como{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              funciona
            </span>
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            4 passos simples para transformar suas ideias em conteúdo de alta
            qualidade
          </p>
        </motion.div>

        <div className="max-w-5xl mx-auto">
          {/* Desktop Timeline */}
          <div className="hidden lg:block relative">
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-primary via-accent to-secondary transform -translate-y-1/2" />
            <div className="grid grid-cols-4 gap-8 relative">
              {steps.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ delay: index * 0.2, duration: 0.6 }}
                  className="relative"
                >
                  <div className="flex flex-col items-center text-center space-y-4">
                    <div className="w-20 h-20 rounded-full bg-background border-4 border-primary flex items-center justify-center relative z-10">
                      <step.icon className="w-8 h-8 text-primary" />
                    </div>
                    <div className="space-y-2">
                      <div className="text-4xl font-bold text-primary/20">
                        {step.number}
                      </div>
                      <h3 className="text-xl font-semibold">{step.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {step.description}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Mobile Timeline */}
          <div className="lg:hidden space-y-8">
            {steps.map((step, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ delay: index * 0.2, duration: 0.6 }}
                className="flex gap-4 items-start"
              >
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary flex items-center justify-center">
                    <step.icon className="w-6 h-6 text-primary" />
                  </div>
                </div>
                <div className="flex-1 space-y-2 pt-2">
                  <div className="text-2xl font-bold text-primary/30">
                    {step.number}
                  </div>
                  <h3 className="text-lg font-semibold">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
