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
    <div className="relative overflow-hidden rounded-2xl shadow-xl h-44 sm:h-48 md:h-56 lg:h-64">
      {/* Background image - object-bottom to always show people */}
      <motion.img
        src={dashboardBannerImg}
        alt=""
        className="absolute inset-0 w-full h-full object-cover object-bottom"
        animate={{ scale: [1, 1.03, 1] }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Overlay for text contrast */}
      <div className="absolute inset-0 bg-gradient-to-r from-foreground/50 via-foreground/25 to-transparent" />

      {/* Content */}
      <div className="relative h-full flex items-center px-5 sm:px-6 md:px-10 z-10">
        <div className="flex flex-col justify-center backdrop-blur-[2px] rounded-xl px-4 py-3 bg-foreground/10">
          <p className="text-white/90 text-[10px] sm:text-xs font-semibold tracking-[0.2em] uppercase">
            {getGreeting()}
          </p>
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white tracking-tight mt-0.5">
            Olá, {firstName}!
          </h1>
          <p className="text-white/80 text-xs sm:text-sm mt-1 max-w-xs sm:max-w-md">
            Pronto para criar conteúdos incríveis?
          </p>
        </div>
      </div>
    </div>
  );
};
