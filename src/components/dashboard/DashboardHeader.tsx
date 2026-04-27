import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Sparkles, CalendarDays, ArrowUpRight } from "lucide-react";

interface DashboardHeaderProps {
  userName: string;
  hasTeam?: boolean;
  brandsCount?: number;
  pendingCount?: number;
  monthCount?: number;
}

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 6) return "Boa madrugada";
  if (hour < 12) return "Bom dia";
  if (hour < 18) return "Boa tarde";
  return "Boa noite";
};

const formatToday = () => {
  const formatter = new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  });
  const text = formatter.format(new Date());
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export const DashboardHeader = ({
  userName,
  hasTeam = false,
  brandsCount = 0,
  pendingCount = 0,
  monthCount = 0,
}: DashboardHeaderProps) => {
  const firstName = userName?.split(" ")[0] || "Equipe";
  const greeting = getGreeting();

  return (
    <motion.section
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-br from-card via-card to-muted/30 p-5 sm:p-6 lg:p-7 shadow-sm"
    >
      {/* Subtle decorative accent — mantém identidade sem dominar */}
      <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-secondary/5 blur-3xl" />

      <div className="relative flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
        {/* Left: greeting + subtitle */}
        <div className="space-y-2">
          <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-muted-foreground">
            {formatToday()}
          </p>
          <h1 className="text-2xl sm:text-3xl lg:text-[2rem] font-bold tracking-tight text-foreground leading-tight">
            {greeting}, <span className="text-primary">{firstName}</span>
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl">
            Crie, ajuste e organize conteúdos das suas marcas em um só lugar.
          </p>
        </div>

        {/* Right: chips above CTAs */}
        <div className="flex flex-col items-stretch lg:items-end gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <SummaryChip label="Marcas ativas" value={brandsCount} dotClass="bg-accent" />
            <SummaryChip label="Em revisão" value={pendingCount} dotClass="bg-chart-1" />
            <SummaryChip label="Criados no mês" value={monthCount} dotClass="bg-success" />
          </div>

          <div className="flex items-center gap-2 lg:justify-end">
            <Link to="/plan">
              <Button
                variant="outline"
                size="sm"
                className="h-10 gap-2 rounded-full border-border/60 bg-background/60 backdrop-blur-sm hover:bg-background"
              >
                <CalendarDays className="h-4 w-4" />
                Calendário
              </Button>
            </Link>
            <Link to="/create">
              <Button
                size="sm"
                className="h-10 gap-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 px-5 font-semibold"
              >
                <Sparkles className="h-4 w-4" />
                Criar conteúdo
                <ArrowUpRight className="h-3.5 w-3.5 opacity-80" />
              </Button>
            </Link>
          </div>

          {hasTeam && (
            <span className="text-[11px] text-muted-foreground hidden sm:inline-flex items-center gap-1.5 lg:justify-end">
              <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
              Workspace da equipe sincronizado
            </span>
          )}
        </div>
      </div>
    </motion.section>
  );
};

const SummaryChip = ({
  label,
  value,
  dotClass,
}: {
  label: string;
  value: number;
  dotClass: string;
}) => (
  <div className="inline-flex items-center gap-2 rounded-full border border-border/40 bg-background/60 backdrop-blur-sm px-3 py-1.5 text-xs">
    <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
    <span className="font-semibold text-foreground tabular-nums">{value.toLocaleString()}</span>
    <span className="text-muted-foreground">{label}</span>
  </div>
);
