import { useParams, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Circle,
  Trash2,
  Search,
  Clock,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import {
  useCalendar,
  useCalendarItems,
  useDeleteCalendar,
  type CalendarItem,
  type CalendarStage,
} from "@/hooks/useCalendars";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { CalendarItemPanel } from "@/components/calendar/CalendarItemPanel";
import { AgentFeedback } from "@/components/AgentFeedback";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const STAGE_LABELS: Record<CalendarStage, string> = {
  calendar: "Pauta",
  briefing: "Briefing",
  design: "Design",
  review: "Ajuste",
  done: "Concluído",
};

const stageRank: Record<CalendarStage, number> = {
  calendar: 0,
  briefing: 1,
  design: 2,
  review: 3,
  done: 4,
};

const STAGE_DOT: Record<CalendarStage, string> = {
  calendar: "bg-muted-foreground/40",
  briefing: "bg-amber-500",
  design: "bg-blue-500",
  review: "bg-purple-500",
  done: "bg-success",
};

const CalendarView = () => {
  const { calendarId } = useParams<{ calendarId: string }>();
  const navigate = useNavigate();
  const { data: calendar, isLoading } = useCalendar(calendarId);
  const { data: items = [] } = useCalendarItems(calendarId);
  const deleteCalendar = useDeleteCalendar();

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const selectedItem =
    items.find((i) => i.id === selectedItemId) || items[0] || null;

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        (i.theme || "").toLowerCase().includes(q)
    );
  }, [items, search]);

  const total = items.length;
  // Progresso ponderado por etapa concluída (4 etapas reais)
  const progressPct = useMemo(() => {
    if (total === 0) return 0;
    const STEPS = 4;
    const completedSteps = items.reduce(
      (acc, i) => acc + Math.min(stageRank[i.stage], STEPS),
      0
    );
    return Math.round((completedSteps / (total * STEPS)) * 100);
  }, [items, total]);
  const doneCount = items.filter((i) => i.stage === "done").length;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16 w-full rounded-2xl" />
        <Skeleton className="h-[70vh] w-full rounded-2xl" />
      </div>
    );
  }

  if (!calendar) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Calendário não encontrado.</p>
        <Button onClick={() => navigate("/plan")} className="mt-4">
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      {/* Breadcrumb discreto */}
      <PageBreadcrumb
        items={[
          { label: "Calendário", href: "/plan" },
          { label: calendar.name },
        ]}
      />

      {/* Resumo compacto do calendário (peso secundário) */}
      <div className="rounded-2xl bg-card shadow-sm px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 text-primary p-2 shrink-0">
            <CalendarIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold truncate">{calendar.name}</h2>
              <span className="text-xs text-muted-foreground shrink-0">
                · {doneCount}/{total} concluídas
              </span>
            </div>
            {calendar.user_input && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {calendar.user_input}
              </p>
            )}
          </div>

          {/* Barra de progresso compacta */}
          <div className="hidden md:flex items-center gap-2 shrink-0">
            <div className="w-32 h-1.5 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-xs font-medium text-muted-foreground tabular-nums w-9 text-right">
              {progressPct}%
            </span>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive shrink-0 h-8 px-2"
              >
                <Trash2 className="h-4 w-4" />
                <span className="hidden sm:inline ml-1">Excluir</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir calendário?</AlertDialogTitle>
                <AlertDialogDescription>
                  Todas as pautas deste calendário serão removidas. Esta ação
                  não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={async () => {
                    await deleteCalendar.mutateAsync(calendar.id);
                    navigate("/plan");
                  }}
                  className="bg-destructive hover:bg-destructive/90"
                >
                  Excluir
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Feedback do agente do briefing principal */}
      {calendar.user_input && (
        <AgentFeedback
          agentId="calendar_briefing"
          targetType="content_calendar"
          targetId={calendar.id}
          brandId={calendar.brand_id}
          contentSnapshot={{
            title: calendar.name,
            briefing: calendar.user_input,
          }}
          label="o briefing principal deste calendário"
        />
      )}

      {/* Layout principal: lista de pautas + editor */}
      <div
        className={cn(
          "grid gap-4 transition-[grid-template-columns] duration-300",
          sidebarOpen
            ? "grid-cols-1 lg:grid-cols-[300px_1fr]"
            : "grid-cols-1 lg:grid-cols-[48px_1fr]"
        )}
      >
        {/* Coluna esquerda: lista de pautas */}
        {sidebarOpen ? (
          <aside className="rounded-2xl bg-card shadow-sm flex flex-col max-h-[calc(100vh-12rem)] overflow-hidden">
            {/* Header com toggle + busca */}
            <div className="px-3 pt-3 pb-2 border-b border-border/40">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Pautas
                  </h3>
                  <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground tabular-nums">
                    {items.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="hidden lg:inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                  title="Recolher lista"
                >
                  <PanelLeftClose className="h-4 w-4" />
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar pauta..."
                  className="h-8 pl-8 text-xs bg-muted/40 border-0 focus-visible:ring-1 focus-visible:ring-primary/40"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {filteredItems.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  active={selectedItem?.id === item.id}
                  onClick={() => setSelectedItemId(item.id)}
                />
              ))}
              {filteredItems.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-8">
                  {items.length === 0
                    ? "Sem pautas neste calendário."
                    : "Nenhuma pauta encontrada."}
                </p>
              )}
            </div>
          </aside>
        ) : (
          <aside className="hidden lg:flex rounded-2xl bg-card shadow-sm w-12 flex-col items-center pt-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="h-8 w-8 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              title="Abrir lista"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          </aside>
        )}

        {/* Painel da pauta selecionada */}
        {selectedItem ? (
          <CalendarItemPanel item={selectedItem} />
        ) : (
          <div className="rounded-2xl bg-card shadow-sm p-12 text-center text-muted-foreground">
            Selecione uma pauta para começar.
          </div>
        )}
      </div>
    </div>
  );
};

const ItemRow = ({
  item,
  active,
  onClick,
}: {
  item: CalendarItem;
  active: boolean;
  onClick: () => void;
}) => {
  const StageIcon =
    item.stage === "done"
      ? CheckCircle2
      : item.stage === "design"
      ? ImageIcon
      : item.stage === "briefing"
      ? FileText
      : item.stage === "calendar"
      ? Clock
      : Circle;

  const isDone = item.stage === "done";
  const meta = (item.metadata || {}) as Record<string, unknown>;
  const platform = (meta.platform as string | null) || null;
  const format = (meta.format as string | null) || null;

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-xl p-2.5 transition-all relative group",
        "border border-transparent",
        active
          ? "bg-primary/8 border-primary/30 shadow-sm"
          : "hover:bg-muted/50"
      )}
    >
      {active && (
        <div className="absolute left-0 top-3 bottom-3 w-0.5 rounded-r-full bg-primary" />
      )}
      <div className="flex items-start gap-2.5">
        <div
          className={cn(
            "h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
            isDone
              ? "bg-success/15 text-success"
              : active
              ? "bg-primary/15 text-primary"
              : "bg-muted text-muted-foreground"
          )}
        >
          <StageIcon className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-sm font-medium leading-tight line-clamp-2",
              isDone && "text-muted-foreground"
            )}
          >
            {item.title}
          </p>
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  STAGE_DOT[item.stage]
                )}
              />
              {STAGE_LABELS[item.stage]}
            </span>
            {item.scheduled_date && (
              <span className="text-[10px] text-muted-foreground">
                ·{" "}
                {new Date(item.scheduled_date).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                })}
              </span>
            )}
            {(platform || format) && (
              <span className="text-[10px] text-muted-foreground truncate">
                · {[platform, format].filter(Boolean).join(" · ")}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
};

export default CalendarView;
