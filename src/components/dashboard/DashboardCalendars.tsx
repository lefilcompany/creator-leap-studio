import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Plus, ArrowRight, CheckCircle2, FileText, Image as ImageIcon, Sparkles, ListChecks, Circle, Clock } from "lucide-react";
import { useCalendars, useCalendarItems, type ContentCalendar, type CalendarStage } from "@/hooks/useCalendars";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const DashboardCalendars = () => {
  const { data: calendars = [], isLoading } = useCalendars();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-primary" />
            Calendários de conteúdo
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Organize suas pautas em fluxos de criação
          </p>
        </div>
        <Button size="sm" asChild>
          <Link to="/calendar/new">
            <Plus className="h-3.5 w-3.5 mr-1" /> Novo calendário
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="h-32 rounded-2xl bg-muted/50 animate-pulse" />
          <div className="h-32 rounded-2xl bg-muted/50 animate-pulse" />
        </div>
      ) : calendars.length === 0 ? (
        <Card className="p-6 text-center border-dashed">
          <CalendarIcon className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-sm font-medium">Nenhum calendário ainda</p>
          <p className="text-xs text-muted-foreground mt-1">
            Crie seu primeiro calendário para organizar a produção de conteúdo.
          </p>
          <Button size="sm" className="mt-3" asChild>
            <Link to="/calendar/new">
              <Plus className="h-3.5 w-3.5 mr-1" /> Criar calendário
            </Link>
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {calendars.map((cal, idx) => (
            <motion.div
              key={cal.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.04 }}
            >
              <CalendarCard calendar={cal} />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

const STAGE_ORDER: CalendarStage[] = ["calendar", "briefing", "design", "review", "done"];

const STAGE_META: Record<CalendarStage, { label: string; icon: typeof FileText }> = {
  calendar: { label: "Pauta definida", icon: ListChecks },
  briefing: { label: "Briefing aprovado", icon: FileText },
  design: { label: "Design criado", icon: ImageIcon },
  review: { label: "Ajustes finais", icon: Sparkles },
  done: { label: "Conteúdo pronto", icon: CheckCircle2 },
};

const CalendarCard = ({ calendar }: { calendar: ContentCalendar }) => {
  const { data: items = [] } = useCalendarItems(calendar.id);
  const total = items.length;
  const done = items.filter((i) => i.stage === "done").length;
  const progressPct = total > 0 ? Math.round((done / total) * 100) : 0;

  const refMonth = calendar.reference_month
    ? new Date(calendar.reference_month).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    : null;

  // Para cada etapa, conta quantos itens já passaram dela (índice >= stage)
  const stageStatus = STAGE_ORDER.map((stage, idx) => {
    const reached = total === 0
      ? 0
      : items.filter((i) => STAGE_ORDER.indexOf(i.stage) >= idx).length;
    const isComplete = total > 0 && reached === total;
    const isActive = !isComplete && reached > 0;
    return { stage, reached, isComplete, isActive };
  });

  return (
    <Link to={`/calendar/${calendar.id}`} className="block group h-full">
      <Card className="p-5 hover:shadow-md hover:border-primary/30 transition-all h-full flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm truncate group-hover:text-primary transition-colors">
              {calendar.name}
            </h3>
            {refMonth && (
              <p className="text-xs text-muted-foreground capitalize mt-0.5">{refMonth}</p>
            )}
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
        </div>

        {/* Barra de progresso */}
        <div className="space-y-1.5 mb-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{done}/{total} concluídos</span>
            <span className="font-medium">{progressPct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-success transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Checklist vertical das etapas */}
        <div className="relative flex-1">
          {/* Linha conectora vertical */}
          <div className="absolute left-[9px] top-2 bottom-2 w-px bg-border/60" aria-hidden />

          <ul className="space-y-2.5 relative">
            {stageStatus.map(({ stage, reached, isComplete, isActive }) => {
              const meta = STAGE_META[stage];
              return (
                <li key={stage} className="flex items-center gap-2.5">
                  <div
                    className={cn(
                      "relative z-10 h-[18px] w-[18px] rounded-full flex items-center justify-center shrink-0 border transition-colors bg-card",
                      isComplete && "bg-success border-success text-success-foreground",
                      isActive && "border-primary text-primary",
                      !isComplete && !isActive && "border-border text-muted-foreground/50"
                    )}
                  >
                    {isComplete ? (
                      <CheckCircle2 className="h-[14px] w-[14px]" strokeWidth={2.5} />
                    ) : isActive ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Circle className="h-2 w-2 fill-current" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-xs flex-1 truncate transition-colors",
                      isComplete && "text-foreground line-through decoration-success/60",
                      isActive && "text-foreground font-medium",
                      !isComplete && !isActive && "text-muted-foreground/70"
                    )}
                  >
                    {meta.label}
                  </span>
                  {total > 0 && (
                    <span
                      className={cn(
                        "text-[10px] tabular-nums px-1.5 py-0.5 rounded-md font-medium shrink-0",
                        isComplete && "bg-success/10 text-success",
                        isActive && "bg-primary/10 text-primary",
                        !isComplete && !isActive && "bg-muted/60 text-muted-foreground/60"
                      )}
                    >
                      {reached}/{total}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </Card>
    </Link>
  );
};
