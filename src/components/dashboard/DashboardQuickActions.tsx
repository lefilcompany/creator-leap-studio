import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "react-router-dom";
import {
  Sparkles,
  CheckCircle,
  Users,
  CalendarDays,
  Video,
  ArrowRight,
} from "lucide-react";

const actions = [
  {
    title: "Criar Conteúdo",
    description: "Textos e imagens com IA",
    icon: Sparkles,
    link: "/create",
    bg: "bg-primary/35",
    iconColor: "text-primary-foreground",
    iconBg: "bg-primary/60",
  },
  {
    title: "Revisar Conteúdo",
    description: "Feedback inteligente",
    icon: CheckCircle,
    link: "/review",
    bg: "bg-success/35",
    iconColor: "text-success-foreground",
    iconBg: "bg-success/60",
  },
  {
    title: "Planejar Calendário",
    description: "Organize suas postagens",
    icon: CalendarDays,
    link: "/plan",
    bg: "bg-accent/35",
    iconColor: "text-accent-foreground",
    iconBg: "bg-accent/60",
  },
  {
    title: "Gerar Vídeo",
    description: "Vídeos criativos com IA",
    icon: Video,
    link: "/create-video",
    bg: "bg-secondary/35",
    iconColor: "text-secondary-foreground",
    iconBg: "bg-secondary/60",
  },
];

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

export const DashboardQuickActions = () => (
  <motion.div
    variants={container}
    initial="hidden"
    animate="show"
    className="grid grid-cols-2 lg:grid-cols-4 gap-3"
  >
    {actions.map((action) => (
      <motion.div key={action.title} variants={item}>
        <Link to={action.link} className="block h-full">
          <Card className="group h-full border-0 shadow-md hover:shadow-xl hover:scale-[1.03] transition-all duration-300 cursor-pointer overflow-hidden">
            <CardContent className={`p-4 h-full ${action.bg} flex flex-col justify-between gap-3`}>
              <div className="flex items-center justify-between">
                <div className={`p-2.5 rounded-xl ${action.iconBg} backdrop-blur-sm shadow-sm ${action.iconColor}`}>
                  <action.icon className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
              </div>
              <div>
                <p className="font-bold text-sm text-foreground">{action.title}</p>
                <p className="text-xs mt-0.5 text-slate-600">{action.description}</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </motion.div>
    ))}
  </motion.div>
);
