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
    gradient: "from-primary/30 via-primary/15 to-primary/5",
    iconColor: "text-primary",
    iconBg: "bg-primary/15",
  },
  {
    title: "Revisar Conteúdo",
    description: "Feedback inteligente",
    icon: CheckCircle,
    link: "/review",
    gradient: "from-success/30 via-success/15 to-success/5",
    iconColor: "text-success",
    iconBg: "bg-success/15",
  },
  {
    title: "Planejar Calendário",
    description: "Organize suas postagens",
    icon: CalendarDays,
    link: "/plan",
    gradient: "from-accent/30 via-accent/15 to-accent/5",
    iconColor: "text-accent",
    iconBg: "bg-accent/15",
  },
  {
    title: "Gerar Vídeo",
    description: "Vídeos criativos com IA",
    icon: Video,
    link: "/create-video",
    gradient: "from-secondary/30 via-secondary/15 to-secondary/5",
    iconColor: "text-secondary",
    iconBg: "bg-secondary/15",
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
            <CardContent className={`p-4 h-full bg-gradient-to-br ${action.gradient} flex flex-col justify-between gap-3`}>
              <div className="flex items-center justify-between">
                <div className={`p-2.5 rounded-xl ${action.iconBg} backdrop-blur-sm shadow-sm ${action.iconColor}`}>
                  <action.icon className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" />
              </div>
              <div>
                <p className="font-bold text-sm text-foreground">{action.title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{action.description}</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </motion.div>
    ))}
  </motion.div>
);
