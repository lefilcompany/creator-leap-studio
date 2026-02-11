import { motion } from "framer-motion";
import { Sun, Moon, Sunset, Coffee } from "lucide-react";

interface DashboardGreetingProps {
  userName: string;
}

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 6) return { text: "Boa madrugada", icon: Moon, emoji: "🌙" };
  if (hour < 12) return { text: "Bom dia", icon: Coffee, emoji: "☀️" };
  if (hour < 18) return { text: "Boa tarde", icon: Sun, emoji: "🌤️" };
  return { text: "Boa noite", icon: Sunset, emoji: "🌙" };
};

export const DashboardGreeting = ({ userName }: DashboardGreetingProps) => {
  const greeting = getGreeting();
  const firstName = userName?.split(" ")[0] || "Usuário";

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex items-center gap-3"
    >
      <motion.span
        className="text-3xl"
        animate={{ rotate: [0, 14, -8, 14, -4, 10, 0] }}
        transition={{ duration: 2.5, delay: 0.5, ease: "easeInOut" }}
      >
        {greeting.emoji}
      </motion.span>
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground tracking-tight">
          {greeting.text}, <span className="text-primary">{firstName}</span>!
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          O que vamos criar hoje?
        </p>
      </div>
    </motion.div>
  );
};
