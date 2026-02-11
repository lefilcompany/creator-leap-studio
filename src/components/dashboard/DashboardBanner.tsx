import { motion } from "framer-motion";
import dashboardBannerImg from "@/assets/dashboard-banner.jpg";

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
      className="relative overflow-hidden rounded-2xl shadow-xl h-44 md:h-52"
    >
      {/* Background image */}
      <img
        src={dashboardBannerImg}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/20 to-transparent" />

      {/* Content */}
      <div className="relative h-full flex flex-col justify-center px-6 md:px-10 z-10">
        <motion.p
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="text-white/70 text-sm font-medium tracking-wide uppercase"
        >
          {getGreeting()}
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="text-2xl md:text-3xl lg:text-4xl font-bold text-white tracking-tight mt-1"
        >
          Olá, {firstName}!
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4 }}
          className="text-white/80 text-sm md:text-base mt-1.5 max-w-md"
        >
          Pronto para criar conteúdos incríveis?
        </motion.p>
      </div>
    </motion.div>
  );
};
