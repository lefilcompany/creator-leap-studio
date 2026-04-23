import { motion } from "framer-motion";
import { Sparkles, Tags, UserCircle, Newspaper } from "lucide-react";
import { Link } from "react-router-dom";

interface DashboardStatsProps {
  actionsCount: number;
  brandsCount: number;
  personasCount?: number;
  themesCount?: number;
  hasTeam?: boolean;
}

const item = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

export const DashboardStats = ({
  actionsCount,
  brandsCount,
  personasCount = 0,
  themesCount = 0,
  hasTeam = false,
}: DashboardStatsProps) => {
  const stats = [
    {
      label: hasTeam ? "Conteúdos da equipe" : "Conteúdos criados",
      value: actionsCount,
      icon: Sparkles,
      color: "text-primary",
      bg: "bg-primary/10",
      link: "/history",
      hint: "Total acumulado",
    },
    {
      label: "Marcas ativas",
      value: brandsCount,
      icon: Tags,
      color: "text-accent",
      bg: "bg-accent/10",
      link: "/brands",
      hint: "No workspace",
    },
    {
      label: "Personas",
      value: personasCount,
      icon: UserCircle,
      color: "text-secondary",
      bg: "bg-secondary/10",
      link: "/personas",
      hint: "Públicos cadastrados",
    },
    {
      label: "Editorias",
      value: themesCount,
      icon: Newspaper,
      color: "text-success",
      bg: "bg-success/10",
      link: "/themes",
      hint: "Linhas estratégicas",
    },
  ];

  return (
    <motion.div
      initial="hidden"
      animate="show"
      transition={{ staggerChildren: 0.06 }}
      className="grid grid-cols-2 lg:grid-cols-4 gap-3"
    >
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <motion.div key={stat.label} variants={item}>
            <Link to={stat.link} className="block h-full group">
              <div className="h-full rounded-2xl border border-border/50 bg-card p-4 hover:border-border hover:shadow-sm transition-all duration-200">
                <div className="flex items-center justify-between mb-3">
                  <div className={`rounded-lg p-1.5 ${stat.bg} ${stat.color}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground/70 uppercase tracking-wider">
                    {stat.hint}
                  </span>
                </div>
                <p className="text-2xl font-bold tracking-tight text-foreground tabular-nums leading-none">
                  {stat.value.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1.5">{stat.label}</p>
              </div>
            </Link>
          </motion.div>
        );
      })}
    </motion.div>
  );
};
