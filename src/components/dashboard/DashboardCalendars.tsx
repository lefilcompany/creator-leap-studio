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

// Etapas exibidas no checklist (cada uma representa uma CONCLUSÃO de fase)
const STAGE_STEPS = [
  { key: "calendar", label: "Pauta definida", icon: ListChecks },
  { key: "briefing", label: "Briefing aprovado", icon: FileText },
  { key: "design", label: "Design criado", icon: ImageIcon },
  { key: "done", label: "Conteúdo pronto", icon: CheckCircle2 },
] as const;

// Para cada etapa, retorna quantos itens JÁ a concluíram.
// Um item em stage = "design" significa: pauta + briefing concluídos; design ainda em andamento.
const stageRank: Record<CalendarStage, number> = {
  calendar: 0, // ainda definindo a pauta
  briefing: 1, // pauta concluída, briefing em andamento
  design: 2,   // briefing concluído, design em andamento
  review: 3,
  done: 4,     // tudo concluído
};

const CalendarCard = ({ calendar }: { calendar: ContentCalendar }) => {
  const { data: items = [] } = useCalendarItems(calendar.id);
  const total = items.length;

  const refMonth = calendar.reference_month
    ? new Date(calendar.reference_month).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    : null;

  // Quantos itens completaram cada etapa (rank do item > rank exigido pela etapa)
  // Etapa "calendar" exige rank > 0 (item saiu de "calendar"); "done" exige rank >= 4.
  const stageStatus = STAGE_STEPS.map((step, idx) => {
    const requiredRank = idx + 1; // calendar→1, briefing→2, design→3, done→4
    const completedCount = items.filter((i) => stageRank[i.stage] >= requiredRank).length;
    return { ...step, completedCount };
  });

  const firstIncompleteIdx = stageStatus.findIndex((s) => s.completedCount < total);
  const enrichedStages = stageStatus.map((s, idx) => ({
    ...s,
    isComplete: total > 0 && s.completedCount === total,
    isWaiting: total > 0 && idx === firstIncompleteIdx && s.completedCount < total,
  }));

  // Progresso ponderado: cada etapa concluída por um item vale 1/4 da pauta
  const totalSteps = total * STAGE_STEPS.length;
  const completedSteps = stageStatus.reduce((acc, s) => acc + s.completedCount, 0);
  const progressPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  const done = items.filter((i) => i.stage === "done").length;

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

          <ul className="space-y-2.5 relative">
            {enrichedStages.map(({ key, label, completedCount, isComplete, isWaiting }) => (
              <li key={key} className="flex items-center gap-2.5">
                <div
                  className={cn(
                    "relative z-10 h-[18px] w-[18px] rounded-full flex items-center justify-center shrink-0 border transition-colors bg-card",
                    isComplete && "bg-success border-success text-success-foreground",
                    isWaiting && "border-primary text-primary bg-primary/5",
                    !isComplete && !isWaiting && "border-border text-muted-foreground/40"
                  )}
                >
                  {isComplete ? (
                    <CheckCircle2 className="h-[14px] w-[14px]" strokeWidth={2.5} />
                  ) : isWaiting ? (
                    <Clock className="h-[11px] w-[11px]" strokeWidth={2.5} />
                  ) : (
                    <Circle className="h-1.5 w-1.5 fill-current" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs flex-1 truncate transition-colors",
                    isComplete && "text-foreground",
                    isWaiting && "text-foreground font-medium",
                    !isComplete && !isWaiting && "text-muted-foreground/50"
                  )}
                >
                  {label}
                </span>
                {total > 0 && (
                  <span
                    className={cn(
                      "text-[10px] tabular-nums px-1.5 py-0.5 rounded-md font-medium shrink-0",
                      isComplete && "bg-success/10 text-success",
                      isWaiting && "bg-primary/10 text-primary",
                      !isComplete && !isWaiting && "bg-muted/60 text-muted-foreground/60"
                    )}
                  >
                    {isComplete ? "OK" : `${completedCount}/${total}`}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </Link>
  );
};
