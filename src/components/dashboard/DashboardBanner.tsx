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
    <div className="relative overflow-hidden rounded-2xl shadow-xl h-44 md:h-52">
      {/* Background image */}
      <img
        src={dashboardBannerImg}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Overlay for readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/30 to-transparent" />

      {/* Content */}
      <div className="relative h-full flex items-center justify-between px-6 md:px-10 z-10">
        {/* Left side - static, no animation */}
        <div className="flex flex-col justify-center">
          <p className="text-white/70 text-sm font-medium tracking-wide uppercase">
            {getGreeting()}
          </p>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white tracking-tight mt-1">
            Olá, {firstName}!
          </h1>
          <p className="text-white/80 text-sm md:text-base mt-1.5 max-w-md">
            Pronto para criar conteúdos incríveis?
          </p>
        </div>

        {/* Right side - animated decorative elements */}
        <div className="hidden md:flex items-center gap-3">
          <motion.div
            animate={{ y: [0, -8, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm"
          />
          <motion.div
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            className="w-6 h-6 rounded-full bg-white/15 backdrop-blur-sm"
          />
          <motion.div
            animate={{ y: [0, -6, 0], opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="w-14 h-14 rounded-full bg-white/5 backdrop-blur-sm border border-white/10"
          />
        </div>
      </div>
    </div>
  );
};
