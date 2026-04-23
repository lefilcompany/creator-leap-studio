import { motion } from "framer-motion";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Zap, ArrowUpRight, CalendarClock, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DashboardCreditsCardProps {
  remainingCredits: number;
  totalCredits: number;
  progressPercentage: number;
  creditsExpireAt?: string | null;
}

export const DashboardCreditsCard = ({
  remainingCredits,
  totalCredits,
  progressPercentage,
  creditsExpireAt,
}: DashboardCreditsCardProps) => {
  const isExpired = creditsExpireAt ? new Date(creditsExpireAt) < new Date() : false;
  const effectiveCredits = isExpired ? 0 : remainingCredits;
  const effectiveProgress = isExpired ? 0 : progressPercentage;
  const isLow = effectiveProgress < 20;
  const used = Math.max(0, totalCredits - effectiveCredits);

  const expirationLabel = creditsExpireAt
    ? format(new Date(creditsExpireAt), "dd 'de' MMM", { locale: ptBR })
    : null;

  const statusLabel = isExpired
    ? "Expirado"
    : isLow
      ? "Saldo baixo"
      : "Saldo saudável";
  const statusDot = isExpired || isLow ? "bg-destructive" : "bg-success";
  const barColor = isExpired || isLow ? "bg-destructive/15" : "bg-primary/10";

  return (
    <motion.div
      id="dashboard-credits-card"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.05 }}
      className="rounded-2xl border border-border/50 bg-card p-4 sm:p-5"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="rounded-lg bg-primary/10 text-primary p-2 shrink-0">
            <Zap className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-xs font-medium text-muted-foreground">Créditos</p>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                <span className={`h-1.5 w-1.5 rounded-full ${statusDot}`} />
                {statusLabel}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 mt-0.5">
              <motion.span
                key={effectiveCredits}
                initial={{ scale: 1.15 }}
                animate={{ scale: 1 }}
                className={`text-2xl font-bold tracking-tight tabular-nums ${isExpired ? "text-destructive" : "text-foreground"}`}
              >
                {effectiveCredits.toLocaleString()}
              </motion.span>
              <span className="text-xs text-muted-foreground tabular-nums">
                / {totalCredits.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        <Link to="/credits" className="shrink-0">
          <Button
            size="sm"
            variant={isLow || isExpired ? "default" : "ghost"}
            className={`h-8 gap-1 rounded-full text-xs ${
              isLow || isExpired
                ? "bg-primary hover:bg-primary/90 px-3"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60 px-2"
            }`}
          >
            {isLow || isExpired ? (
              <>
                Comprar
                <ArrowUpRight className="h-3 w-3" />
              </>
            ) : (
              <>
                Gerenciar
                <ArrowUpRight className="h-3 w-3" />
              </>
            )}
          </Button>
        </Link>
      </div>

      <Progress value={effectiveProgress} className={`h-1.5 ${barColor}`} />

      <div className="flex items-center justify-between mt-2.5 text-[11px] text-muted-foreground">
        <span className="tabular-nums">
          {isExpired ? (
            <span className="inline-flex items-center gap-1 text-destructive">
              <AlertTriangle className="h-3 w-3" />
              Adquira um novo pacote
            </span>
          ) : (
            <>
              <span className="font-medium text-foreground">{used.toLocaleString()}</span> usados ·{" "}
              <span className="font-medium text-foreground">{effectiveCredits.toLocaleString()}</span> restantes
            </>
          )}
        </span>
        {expirationLabel && !isExpired && effectiveCredits > 0 && (
          <span className="inline-flex items-center gap-1">
            <CalendarClock className="h-3 w-3" />
            até {expirationLabel}
          </span>
        )}
      </div>
    </motion.div>
  );
};
