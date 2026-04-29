import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar as CalendarIcon,
  Plus,
  ArrowRight,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  ListChecks,
  Clock,
  AlertTriangle,
  Sparkles,
  Tag,
} from "lucide-react";
import {
  useCalendars,
  useCalendarItems,
  type ContentCalendar,
  type CalendarStage,
} from "@/hooks/useCalendars";
import { useBrands } from "@/hooks/useBrands";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type FilterKey = "all" | "in_progress" | "late" | "done";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "in_progress", label: "Em andamento" },
  { key: "late", label: "Atrasados" },
  { key: "done", label: "Concluídos" },
];

export const DashboardCalendars = () => {
  const { data: calendars = [], isLoading } = useCalendars();
  const [filter, setFilter] = useState<FilterKey>("all");

  const activeCount = calendars.length;

  return (
    <section className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/15">
              <CalendarIcon className="h-4 w-4 text-primary" />
            </div>
            <h2 className="text-base font-semibold tracking-tight">
              Calendários de conteúdo
            </h2>
            {activeCount > 0 && (
              <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold tabular-nums text-foreground/70">
                {activeCount}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground sm:ml-[42px]">
            Acompanhe o que está em produção, o que precisa de atenção e o próximo passo de cada calendário.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-foreground" asChild>
            <Link to="/plan">Ver todos</Link>
          </Button>
          <Button size="sm" className="h-8" asChild>
            <Link to="/calendar/new">
              <Plus className="mr-1 h-3.5 w-3.5" /> Novo calendário
            </Link>
          </Button>
        </div>
      </div>

      {/* Filter chips */}
      {calendars.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((f) => {
            const isActive = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-all",
                  isActive
                    ? "border-primary/30 bg-primary/10 text-primary shadow-sm"
                    : "border-border/60 bg-background text-muted-foreground hover:border-border hover:text-foreground"
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div className="h-44 animate-pulse rounded-2xl bg-muted/50" />
          <div className="h-44 animate-pulse rounded-2xl bg-muted/50" />
          <div className="h-44 animate-pulse rounded-2xl bg-muted/50" />
        </div>
      ) : calendars.length === 0 ? (
        <EmptyState />
      ) : (
        <CalendarsGrid calendars={calendars} filter={filter} />
      )}
    </section>
  );
};

const EmptyState = () => (
  <div className="rounded-2xl border border-dashed border-border/60 bg-card/50 p-8 text-center">
    <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
      <CalendarIcon className="h-5 w-5 text-primary" />
    </div>
    <p className="text-sm font-semibold">Nenhum calendário ainda</p>
    <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">
      Crie seu primeiro calendário para organizar pautas, briefings, designs e conteúdo final em um só lugar.
    </p>
    <Button size="sm" className="mt-4" asChild>
      <Link to="/calendar/new">
        <Plus className="mr-1 h-3.5 w-3.5" /> Criar calendário
      </Link>
    </Button>
  </div>
);

// ============== Grid with filtering (needs items per calendar) ==============
const CalendarsGrid = ({
  calendars,
  filter,
}: {
  calendars: ContentCalendar[];
  filter: FilterKey;
}) => {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {calendars.map((cal, idx) => (
        <motion.div
          key={cal.id}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.04, duration: 0.25 }}
        >
          <CalendarCard calendar={cal} filter={filter} />
        </motion.div>
      ))}
    </div>
  );
};

// ============== Card ==============
const stageRank: Record<CalendarStage, number> = {
  calendar: 0,
  briefing: 1,
  design: 2,
  review: 3,
  done: 4,
};

type Status = "waiting_briefing" | "in_progress" | "in_review" | "done" | "late" | "empty";

const STATUS_CONFIG: Record<
  Status,
  { label: string; className: string; dotClass: string }
> = {
  empty: {
    label: "Sem pautas",
    className: "bg-muted text-muted-foreground border-border/60",
    dotClass: "bg-muted-foreground/40",
  },
  waiting_briefing: {
    label: "Aguardando briefing",
    className: "bg-chart-1/10 text-chart-1 border-chart-1/20",
    dotClass: "bg-chart-1",
  },
  in_progress: {
    label: "Em andamento",
    className: "bg-primary/10 text-primary border-primary/20",
    dotClass: "bg-primary",
  },
  in_review: {
    label: "Em revisão",
    className: "bg-amber-500/10 text-amber-600 border-amber-500/20 dark:text-amber-400",
    dotClass: "bg-amber-500",
  },
  done: {
    label: "Concluído",
    className: "bg-success/10 text-success border-success/20",
    dotClass: "bg-success",
  },
  late: {
    label: "Atrasado",
    className: "bg-destructive/10 text-destructive border-destructive/20",
    dotClass: "bg-destructive",
  },
};

const formatRelative = (dateStr: string) => {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `há ${days}d`;
  const months = Math.floor(days / 30);
  return `há ${months}mes`;
};

const CalendarCard = ({
  calendar,
  filter,
}: {
  calendar: ContentCalendar;
  filter: FilterKey;
}) => {
  const { data: items = [] } = useCalendarItems(calendar.id);
  const { data: brands = [] } = useBrands();

  const total = items.length;
  const brand = brands.find((b) => b.id === calendar.brand_id);

  const refMonth = calendar.reference_month
    ? new Date(calendar.reference_month).toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      })
    : null;

  // Compute aggregate stats
  const stats = useMemo(() => {
    const byStage: Record<CalendarStage, number> = {
      calendar: 0,
      briefing: 0,
      design: 0,
      review: 0,
      done: 0,
    };
    for (const item of items) byStage[item.stage]++;

    // Weighted progress: each item contributes its rank/4
    const weighted = items.reduce((acc, i) => acc + stageRank[i.stage], 0);
    const maxWeight = total * 4;
    const progressPct = maxWeight > 0 ? Math.round((weighted / maxWeight) * 100) : 0;

    return { byStage, progressPct };
  }, [items, total]);

  // Determine card status
  const status: Status = useMemo(() => {
    if (total === 0) return "empty";
    if (stats.byStage.done === total) return "done";

    // Check late: reference_month is in the past and not done
    if (calendar.reference_month) {
      const refDate = new Date(calendar.reference_month);
      const now = new Date();
      const refMonthEnd = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0);
      if (refMonthEnd < now && stats.byStage.done < total) return "late";
    }

    if (stats.byStage.calendar === total) return "waiting_briefing";
    if (stats.byStage.review > 0) return "in_review";
    return "in_progress";
  }, [calendar.reference_month, stats.byStage, total]);

  // Apply filter
  const matchesFilter = useMemo(() => {
    if (filter === "all") return true;
    if (filter === "done") return status === "done";
    if (filter === "late") return status === "late";
    if (filter === "in_progress")
      return status === "in_progress" || status === "waiting_briefing" || status === "in_review";
    return true;
  }, [filter, status]);

  if (!matchesFilter) return null;

  // Next step recommendation
  const nextStep = useMemo(() => {
    if (total === 0)
      return { icon: ListChecks, label: "Adicionar pautas ao calendário" };
    if (stats.byStage.calendar > 0)
      return {
        icon: FileText,
        label: `Definir briefing de ${stats.byStage.calendar} ${stats.byStage.calendar === 1 ? "pauta" : "pautas"}`,
      };
    if (stats.byStage.briefing > 0)
      return {
        icon: FileText,
        label: `Aprovar briefing de ${stats.byStage.briefing} ${stats.byStage.briefing === 1 ? "pauta" : "pautas"}`,
      };
    if (stats.byStage.design > 0)
      return {
        icon: ImageIcon,
        label: `${stats.byStage.design} ${stats.byStage.design === 1 ? "pauta aguarda" : "pautas aguardam"} design`,
      };
    if (stats.byStage.review > 0)
      return {
        icon: Sparkles,
        label: `Revisar ${stats.byStage.review} ${stats.byStage.review === 1 ? "conteúdo" : "conteúdos"}`,
      };
    return { icon: CheckCircle2, label: "Tudo concluído!" };
  }, [stats.byStage, total]);

  const NextIcon = nextStep.icon;
  const statusCfg = STATUS_CONFIG[status];
  const isDone = status === "done";
  const isLate = status === "late";

  // CTA label based on status
  const ctaLabel = isDone
    ? "Abrir calendário"
    : isLate
      ? "Revisar pendências"
      : total === 0
        ? "Configurar pautas"
        : "Continuar";

  return (
    <Link
      to={`/calendar/${calendar.id}`}
      className="group block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:rounded-2xl"
    >
      <article
        className={cn(
          "relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card p-4 transition-all duration-200",
          "hover:-translate-y-0.5 hover:shadow-lg hover:shadow-foreground/5",
          isLate
            ? "border-destructive/25 hover:border-destructive/40"
            : isDone
              ? "border-success/25 hover:border-success/40"
              : "border-border/60 hover:border-primary/30"
        )}
      >
        {/* Late accent stripe */}
        {isLate && (
          <div className="pointer-events-none absolute left-0 top-0 h-full w-1 bg-destructive/70" />
        )}

        {/* Header: Title + Status */}
        <header className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold leading-tight text-foreground transition-colors group-hover:text-primary">
              {calendar.name}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
              {refMonth && <span className="capitalize">{refMonth}</span>}
              {brand && (
                <>
                  {refMonth && <span className="text-muted-foreground/40">•</span>}
                  <span className="inline-flex items-center gap-1">
                    <Tag className="h-2.5 w-2.5" />
                    <span className="truncate max-w-[100px]">{brand.name}</span>
                  </span>
                </>
              )}
            </div>
          </div>

          <Badge
            variant="outline"
            className={cn(
              "shrink-0 gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              statusCfg.className
            )}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", statusCfg.dotClass)} />
            {statusCfg.label}
          </Badge>
        </header>

        {/* Progress */}
        <div className="mb-3 space-y-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold tabular-nums leading-none text-foreground">
                {stats.progressPct}%
              </span>
              <span className="text-[11px] text-muted-foreground">
                · {stats.byStage.done}/{total} concluídos
              </span>
            </div>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-500",
                isDone ? "bg-success" : isLate ? "bg-destructive" : "bg-primary"
              )}
              style={{ width: `${Math.max(stats.progressPct, 2)}%` }}
            />
          </div>
        </div>

        {/* Stage chips — compact summary */}
        {total > 0 && (
          <div className="mb-3 flex flex-wrap gap-1">
            {stats.byStage.calendar > 0 && (
              <StageChip icon={ListChecks} count={stats.byStage.calendar} label="pauta" tone="neutral" />
            )}
            {stats.byStage.briefing > 0 && (
              <StageChip icon={FileText} count={stats.byStage.briefing} label="briefing" tone="info" />
            )}
            {stats.byStage.design > 0 && (
              <StageChip icon={ImageIcon} count={stats.byStage.design} label="design" tone="info" />
            )}
            {stats.byStage.review > 0 && (
              <StageChip icon={Sparkles} count={stats.byStage.review} label="revisão" tone="warn" />
            )}
            {stats.byStage.done > 0 && (
              <StageChip icon={CheckCircle2} count={stats.byStage.done} label="ok" tone="success" />
            )}
          </div>
        )}

        {/* Next step */}
        <div
          className={cn(
            "mb-3 flex items-start gap-2 rounded-lg border px-3 py-2",
            isDone
              ? "border-success/20 bg-success/5"
              : isLate
                ? "border-destructive/25 bg-destructive/5"
                : "border-border/50 bg-muted/40"
          )}
        >
          <div
            className={cn(
              "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md",
              isDone
                ? "bg-success/15 text-success"
                : isLate
                  ? "bg-destructive/15 text-destructive"
                  : "bg-primary/10 text-primary"
            )}
          >
            {isLate ? <AlertTriangle className="h-3 w-3" /> : <NextIcon className="h-3 w-3" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {isLate ? "Atenção" : isDone ? "Status" : "Próximo passo"}
            </p>
            <p className="truncate text-xs font-medium text-foreground">{nextStep.label}</p>
          </div>
        </div>

        {/* Footer: last update + CTA */}
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatRelative(calendar.updated_at)}
          </span>
          <span
            className={cn(
              "inline-flex items-center gap-1 text-xs font-semibold transition-all",
              isDone
                ? "text-success"
                : isLate
                  ? "text-destructive"
                  : "text-primary",
              "group-hover:gap-1.5"
            )}
          >
            {ctaLabel}
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </article>
    </Link>
  );
};

const StageChip = ({
  icon: Icon,
  count,
  label,
  tone,
}: {
  icon: React.ElementType;
  count: number;
  label: string;
  tone: "neutral" | "info" | "warn" | "success";
}) => {
  const toneClass = {
    neutral: "bg-muted text-muted-foreground",
    info: "bg-primary/8 text-primary/90",
    warn: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    success: "bg-success/10 text-success",
  }[tone];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium tabular-nums",
        toneClass
      )}
    >
      <Icon className="h-2.5 w-2.5" />
      {count} {label}
    </span>
  );
};
