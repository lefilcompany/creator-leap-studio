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
    <div className="relative overflow-hidden rounded-2xl shadow-xl h-56 sm:h-48 md:h-52">
      {/* Background image - object-bottom on mobile to show people */}
      <motion.img
        src={dashboardBannerImg}
        alt=""
        className="absolute inset-0 w-full h-full object-cover object-bottom sm:object-center"
        animate={{ scale: [1, 1.03, 1] }}
        transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }} />

      {/* Overlay - stronger on mobile for readability over busy image */}
      <div className="absolute inset-0 bg-gradient-to-t sm:bg-gradient-to-r from-black/50 via-black/30 to-transparent sm:from-black/35 sm:via-black/15 sm:to-transparent" />

      {/* Content */}
      <div className="relative h-full flex items-end sm:items-center px-4 sm:px-6 md:px-10 pb-4 sm:pb-0 z-10">
        <div className="flex flex-col justify-center backdrop-blur-sm rounded-xl px-4 py-3 sm:px-5 sm:py-4 bg-white/10 sm:bg-[#d8baf2]/25 border border-white/10">
          <p className="text-white/90 text-xs sm:text-sm font-semibold tracking-widest uppercase">
            {getGreeting()}
          </p>
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-white tracking-tight mt-0.5 sm:mt-1">
            Olá, {firstName}!
          </h1>
          <p className="text-white/80 text-xs sm:text-sm md:text-base mt-1 max-w-md">
            Pronto para criar conteúdos incríveis?
          </p>
        </div>
      </div>
    </div>);

};