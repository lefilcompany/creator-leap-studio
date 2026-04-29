import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  CalendarPlus,
  ArrowUpRight,
  FileText,
  Image as ImageIcon,
  Sparkles,
} from "lucide-react";

const primaryAction = {
  title: "Novo calendário",
  description:
    "Inicie um calendário para organizar pautas, briefings, designs e conteúdo final em um único fluxo.",
  icon: CalendarPlus,
  link: "/calendar/new",
  cta: "Iniciar calendário",
};

const flowSteps = [
  { label: "Briefing", icon: FileText },
  { label: "Design", icon: ImageIcon },
  { label: "Conteúdo", icon: Sparkles },
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
    <motion.div variants={container} initial="hidden" animate="show">
      <motion.div variants={item}>
        <Link to={primaryAction.link} className="block group">
          <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary to-primary/80 p-6 sm:p-8 text-primary-foreground shadow-lg shadow-primary/15 hover:shadow-xl hover:shadow-primary/25 transition-all duration-300">
            {/* Decorative blurs */}
            <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
            <div className="pointer-events-none absolute -right-10 -bottom-16 h-48 w-48 rounded-full bg-secondary/30 blur-3xl" />
            <div className="pointer-events-none absolute -left-12 top-1/2 h-40 w-40 rounded-full bg-white/5 blur-2xl" />

            <div className="relative flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-10">
              {/* Left: title + description */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div className="rounded-xl bg-white/15 backdrop-blur-sm p-3 ring-1 ring-white/20 shrink-0">
                    <PrimaryIcon className="h-6 w-6" />
                  </div>
                  <ArrowUpRight className="h-5 w-5 opacity-70 group-hover:opacity-100 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all lg:hidden" />
                </div>
                <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-white/70 mt-4 mb-1.5">
                  Ação principal
                </p>
                <h3 className="text-2xl sm:text-3xl font-bold leading-tight">
                  {primaryAction.title}
                </h3>
                <p className="text-sm text-white/85 mt-2 max-w-xl leading-relaxed">
                  {primaryAction.description}
                </p>
              </div>

              {/* Right: flow steps + CTA */}
              <div className="flex flex-col gap-4 lg:items-end lg:shrink-0">
                <div className="flex items-center gap-2 rounded-xl bg-white/10 backdrop-blur-sm ring-1 ring-white/15 p-2">
                  {flowSteps.map((step, idx) => {
                    const StepIcon = step.icon;
                    return (
                      <div key={step.label} className="flex items-center gap-2">
                        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/10">
                          <StepIcon className="h-3.5 w-3.5" />
                          <span className="text-xs font-medium">{step.label}</span>
                        </div>
                        {idx < flowSteps.length - 1 && (
                          <span className="text-white/40 text-xs">→</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="hidden lg:inline-flex items-center gap-2 rounded-xl bg-white text-primary px-5 py-3 font-semibold text-sm shadow-md group-hover:shadow-lg group-hover:-translate-y-0.5 transition-all">
                  {primaryAction.cta}
                  <ArrowUpRight className="h-4 w-4" />
                </div>
              </div>
            </div>
          </div>
        </Link>
      </motion.div>
    </motion.div>
  );
};
