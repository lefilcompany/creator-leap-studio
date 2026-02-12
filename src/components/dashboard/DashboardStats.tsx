import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Tags, UserCircle, Palette } from "lucide-react";
import { Link } from "react-router-dom";

interface DashboardStatsProps {
  actionsCount: number;
  brandsCount: number;
  personasCount?: number;
  themesCount?: number;
}

const statItem = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export const DashboardStats = ({ actionsCount, brandsCount, personasCount = 0, themesCount = 0 }: DashboardStatsProps) => {
  const stats = [
    {
      label: "Conteúdos da Equipe",
      value: actionsCount,
      icon: Sparkles,
      color: "text-primary",
      bg: "bg-primary/10",
      link: "/history",
    },
    {
      label: "Marcas Ativas",
      value: brandsCount,
      icon: Tags,
      color: "text-accent",
      bg: "bg-accent/10",
      link: "/brands",
    },
    {
      label: "Personas",
      value: personasCount,
      icon: UserCircle,
      color: "text-secondary",
      bg: "bg-secondary/10",
      link: "/personas",
    },
    {
      label: "Temas Estratégicos",
      value: themesCount,
      icon: Palette,
      color: "text-success",
      bg: "bg-success/10",
      link: "/themes",
    },
  ];

  return (
    <motion.div
      initial="hidden"
      animate="show"
      transition={{ staggerChildren: 0.1 }}
      className="grid grid-cols-2 lg:grid-cols-4 gap-3"
    >
      {stats.map((stat) => (
        <motion.div key={stat.label} variants={statItem}>
          <Link to={stat.link}>
            <Card className="group border-0 shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${stat.bg} ${stat.color}`}>
                  <stat.icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-2xl font-bold tracking-tight text-foreground">{stat.value.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </motion.div>
      ))}
    </motion.div>
  );
};
