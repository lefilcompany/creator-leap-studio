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
      {/* Background image with slow zoom */}
      <motion.img
        src={dashboardBannerImg}
        alt=""
        className="absolute inset-0 w-full h-full object-cover object-top"
        animate={{ scale: [1, 1.06, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Subtle overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/35 via-black/15 to-transparent" />

      {/* Content */}
      <div className="relative h-full flex items-center px-6 md:px-10 z-10">
        <div className="flex flex-col justify-center">
          <p className="text-white/80 text-sm font-medium tracking-wide uppercase">
            {getGreeting()}
          </p>
          <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white tracking-tight mt-1 drop-shadow-md">
            Olá, {firstName}!
          </h1>
          <p className="text-white/90 text-sm md:text-base mt-1.5 max-w-md drop-shadow-sm">
            Pronto para criar conteúdos incríveis?
          </p>
        </div>
      </div>
    </div>
  );
};
