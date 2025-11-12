import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import CountUp from "react-countup";

const stats = [
  {
    value: 10000,
    suffix: "+",
    label: "Conteúdos Criados",
  },
  {
    value: 5000,
    suffix: "+",
    label: "Horas Economizadas",
  },
  {
    value: 500,
    suffix: "+",
    label: "Marcas Gerenciadas",
  },
  {
    value: 2000,
    suffix: "+",
    label: "Personas Ativas",
  },
];

export const Stats = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.3,
  });

  return (
    <section className="py-20 lg:py-32 relative bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <div className="container mx-auto px-4 lg:px-8">
        <div
          ref={ref}
          className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 max-w-6xl mx-auto"
        >
          {stats.map((stat, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, scale: 0.5 }}
              animate={inView ? { opacity: 1, scale: 1 } : {}}
              transition={{ delay: index * 0.1, duration: 0.6 }}
              className="text-center space-y-2"
            >
              <div className="text-4xl md:text-5xl lg:text-6xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                {inView && (
                  <CountUp
                    end={stat.value}
                    duration={2.5}
                    separator="."
                    suffix={stat.suffix}
                  />
                )}
              </div>
              <div className="text-sm md:text-base lg:text-lg text-muted-foreground font-medium">
                {stat.label}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
