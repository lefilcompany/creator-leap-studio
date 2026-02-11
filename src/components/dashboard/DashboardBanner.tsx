import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Plus, Sparkles } from "lucide-react";
import logoCreatorBranca from "@/assets/logoCreatorBranca.png";

interface DashboardBannerProps {
  userName: string;
}

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 6) return "Boa madrugada";
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
};

export const DashboardBanner = ({ userName }: DashboardBannerProps) => {
  const firstName = userName?.split(" ")[0] || "Usuário";

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-secondary shadow-xl"
    >
      {/* Decorative blurs */}
      <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-secondary/30 blur-3xl -translate-y-1/2 translate-x-1/4" />
      <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-primary/40 blur-3xl translate-y-1/2 -translate-x-1/4" />
      <div className="absolute top-1/2 right-1/4 w-24 h-24 rounded-full bg-accent/20 blur-2xl" />

      <div className="relative flex items-center justify-between px-6 md:px-10 py-8 md:py-10">
        <div className="flex-1 space-y-3 z-10">
          <p className="text-primary-foreground/70 text-sm font-medium tracking-wide uppercase">
            {getGreeting()}
          </p>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-primary-foreground tracking-tight">
            Olá, {firstName}!
          </h1>
          <p className="text-primary-foreground/80 text-sm md:text-base max-w-md">
            Pronto para criar conteúdos incríveis? Sua próxima grande ideia começa aqui.
          </p>
          <div className="pt-2">
            <Link to="/create">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button
                  size="lg"
                  className="rounded-full bg-card text-primary hover:bg-card/90 shadow-lg font-semibold gap-2 px-6"
                >
                  <Plus className="h-4 w-4" />
                  Criar Conteúdo
                </Button>
              </motion.div>
            </Link>
          </div>
        </div>

        {/* Logo decoration */}
        <div className="hidden md:block relative z-10">
          <motion.img
            src={logoCreatorBranca}
            alt="Creator"
            className="h-20 lg:h-24 opacity-30"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 0.3, x: 0 }}
            transition={{ delay: 0.3, duration: 0.6 }}
          />
        </div>
      </div>
    </motion.div>
  );
};
