import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Sparkles,
  CheckCircle,
  CalendarDays,
  Video,
  ArrowUpRight,
} from "lucide-react";

const primaryAction = {
  title: "Criar conteúdo",
  description: "Gere posts completos com IA: imagem, copy e hashtags.",
  icon: Sparkles,
  link: "/create",
};

const secondaryActions = [
  {
    title: "Ajustar conteúdo",
    description: "Refine textos e imagens existentes",
    icon: CheckCircle,
    link: "/review",
    iconColor: "text-success",
    iconBg: "bg-success/10",
  },
  {
    title: "Calendário",
    description: "Planeje as próximas postagens",
    icon: CalendarDays,
    link: "/plan",
    iconColor: "text-accent",
    iconBg: "bg-accent/10",
  },
  {
    title: "Gerar vídeo",
    description: "Vídeos curtos com IA",
    icon: Video,
    link: "/create-video",
    iconColor: "text-secondary",
    iconBg: "bg-secondary/10",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export const DashboardQuickActions = () => {
  const PrimaryIcon = primaryAction.icon;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="grid grid-cols-1 lg:grid-cols-5 gap-3">
      {/* Primary — destaque, ocupa 2 colunas no desktop */}
      <motion.div variants={item} className="lg:col-span-2">
        <Link to={primaryAction.link} className="block h-full group">
          <div className="relative h-full overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary to-primary/80 p-5 text-primary-foreground shadow-lg shadow-primary/15 hover:shadow-xl hover:shadow-primary/25 transition-all duration-300">
            <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
            <div className="pointer-events-none absolute -right-8 -bottom-12 h-32 w-32 rounded-full bg-secondary/30 blur-2xl" />

            <div className="relative flex h-full flex-col justify-between gap-4">
              <div className="flex items-start justify-between">
                <div className="rounded-xl bg-white/15 backdrop-blur-sm p-2.5 ring-1 ring-white/20">
                  <PrimaryIcon className="h-5 w-5" />
                </div>
                <ArrowUpRight className="h-5 w-5 opacity-70 group-hover:opacity-100 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all" />
              </div>
              <div>
                <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-white/70 mb-1">
                  Ação principal
                </p>
                <h3 className="text-lg font-bold leading-tight">{primaryAction.title}</h3>
                <p className="text-xs text-white/80 mt-1 max-w-xs">{primaryAction.description}</p>
              </div>
            </div>
          </div>
        </Link>
      </motion.div>

      {/* Secondary actions */}
      {secondaryActions.map((action) => {
        const Icon = action.icon;
        return (
          <motion.div key={action.title} variants={item}>
            <Link to={action.link} className="block h-full group">
              <div className="relative h-full overflow-hidden rounded-2xl border border-border/50 bg-card p-4 hover:border-border hover:shadow-md transition-all duration-200">
                <div className="flex items-start justify-between mb-3">
                  <div className={`rounded-lg p-2 ${action.iconBg} ${action.iconColor}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-foreground group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="font-semibold text-sm text-foreground leading-tight">{action.title}</p>
                <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                  {action.description}
                </p>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </motion.div>
  );
};
