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

const CreatorFigure = ({ color, size = 48, delay = 0 }: { color: string; size?: number; delay?: number }) => (
  <motion.svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    animate={{ y: [0, -5, 0] }}
    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay }}
  >
    {/* Head */}
    <circle cx="24" cy="12" r="7" fill={color} opacity="0.9" />
    {/* Body */}
    <path d="M14 44 C14 30 14 26 24 22 C34 26 34 30 34 44" fill={color} opacity="0.7" />
    {/* Creative spark */}
    <circle cx="33" cy="7" r="2.5" fill={color} opacity="0.45" />
  </motion.svg>
);

export const DashboardBanner = ({ userName }: DashboardBannerProps) => {
  const firstName = userName?.split(" ")[0] || "Usuário";

  return (
    <div className="relative overflow-hidden rounded-2xl shadow-xl h-44 md:h-52">
      {/* Background image with slow zoom animation */}
      <motion.img
        src={dashboardBannerImg}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        animate={{ scale: [1, 1.08, 1] }}
        transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Animated shimmer overlay */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/8 to-transparent"
        animate={{ x: ["-100%", "100%"] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", repeatDelay: 4 }}
      />
      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/30 to-transparent" />

      {/* Content */}
      <div className="relative h-full flex items-center justify-between px-6 md:px-10 z-10">
        {/* Left - static text */}
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

        {/* Right - animated creator figures */}
        <div className="hidden md:flex items-end gap-4 pb-6">
          <CreatorFigure color="hsl(330, 100%, 65%)" size={56} delay={0} />
          <CreatorFigure color="hsl(269, 66%, 60%)" size={44} delay={0.7} />
          <CreatorFigure color="hsl(201, 73%, 55%)" size={38} delay={1.4} />
        </div>
      </div>
    </div>
  );
};
