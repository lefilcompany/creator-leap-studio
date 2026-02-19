import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Zap, ArrowRight, TrendingUp } from "lucide-react";

interface DashboardCreditsCardProps {
  remainingCredits: number;
  totalCredits: number;
  progressPercentage: number;
}

export const DashboardCreditsCard = ({
  remainingCredits,
  totalCredits,
  progressPercentage,
}: DashboardCreditsCardProps) => {
  const isLow = progressPercentage < 20;
  const isMedium = progressPercentage >= 20 && progressPercentage < 50;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, delay: 0.1 }}
    >
      <Card
        id="dashboard-credits-card"
        className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-primary/10 via-card to-secondary/10"
      >
        {/* Decorative circles */}
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-primary/5 blur-2xl" />
        <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-secondary/5 blur-2xl" />

        <CardContent className="relative p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-0 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-2.5 rounded-xl bg-primary/15 text-primary">
                <Zap className="h-4 w-4 sm:h-5 sm:w-5" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-medium text-muted-foreground">Créditos Disponíveis</p>
                <div className="flex items-baseline gap-2">
                  <motion.span
                    key={remainingCredits}
                    initial={{ scale: 1.2, color: "hsl(var(--primary))" }}
                    animate={{ scale: 1, color: "hsl(var(--foreground))" }}
                    className="text-2xl sm:text-3xl font-bold tracking-tight"
                  >
                    {remainingCredits.toLocaleString()}
                  </motion.span>
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    / {totalCredits.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="self-end sm:self-auto"
            >
              <Link to="/plans">
                <Button size="sm" className={`rounded-full gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-md text-xs sm:text-sm font-semibold px-5 ${isLow ? 'animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]' : ''}`}>
                  <Zap className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  Comprar Créditos
                  <ArrowRight className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                </Button>
              </Link>
            </motion.div>
          </div>

          <div className="space-y-2">
            <Progress
              value={progressPercentage}
              className={`h-2.5 ${isLow ? 'bg-destructive/20' : isMedium ? 'bg-chart-1/20' : 'bg-primary/15'}`}
            />
            <p className="text-xs text-muted-foreground">
              {isLow
                ? "⚠️ Créditos baixos — considere recarregar"
                : `${Math.round(progressPercentage)}% do seu saldo disponível`}
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
