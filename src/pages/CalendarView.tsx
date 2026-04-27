import { useParams, useNavigate, Link } from "react-router-dom";
import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar as CalendarIcon,
  CheckCircle2,
  FileText,
  Image as ImageIcon,
  Sparkles,
  Circle,
  Trash2,
} from "lucide-react";
import { useCalendar, useCalendarItems, useDeleteCalendar, type CalendarItem, type CalendarStage } from "@/hooks/useCalendars";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { CalendarItemPanel } from "@/components/calendar/CalendarItemPanel";
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
  calendar: "Calendário",
  briefing: "Briefing",
  design: "Design",
  review: "Revisão",
  done: "Concluído",
};

const STAGE_COLORS: Record<CalendarStage, string> = {
  calendar: "bg-muted text-muted-foreground",
  briefing: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  design: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  review: "bg-purple-500/15 text-purple-700 dark:text-purple-400",
  done: "bg-success/15 text-success",
};

const CalendarView = () => {
  const { calendarId } = useParams<{ calendarId: string }>();
  const navigate = useNavigate();
  const { data: calendar, isLoading } = useCalendar(calendarId);
  const { data: items = [] } = useCalendarItems(calendarId);
  const deleteCalendar = useDeleteCalendar();

  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const selectedItem = items.find((i) => i.id === selectedItemId) || items[0] || null;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (!calendar) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Calendário não encontrado.</p>
        <Button onClick={() => navigate("/plan")} className="mt-4">Voltar</Button>
      </div>
    );
  }

  const total = items.length;
  const done = items.filter((i) => i.stage === "done").length;
  const progressPct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="space-y-5 pb-8">
      <PageBreadcrumb
        items={[
          { label: "Calendário", href: "/plan" },
          { label: calendar.name },
        ]}
      />

      <Card className="p-5">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="rounded-xl bg-primary/10 text-primary p-2.5">
              <CalendarIcon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold truncate">{calendar.name}</h1>
              {calendar.user_input && (
                <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                  {calendar.user_input}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge variant="outline" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" /> {done}/{total} concluídos
                </Badge>
                <Badge variant="outline">{progressPct}% do calendário</Badge>
              </div>
            </div>
          </div>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-destructive shrink-0">
                <Trash2 className="h-4 w-4 mr-1" /> Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir calendário?</AlertDialogTitle>
                <AlertDialogDescription>
                  Todas as pautas deste calendário serão removidas. Esta ação não pode ser desfeita.
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
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        {/* Lista de pautas */}
        <Card className="p-3 max-h-[70vh] overflow-y-auto">
          <div className="px-2 pb-2 flex items-center justify-between">
            <h3 className="font-semibold text-sm">Pautas</h3>
            <span className="text-xs text-muted-foreground">{items.length}</span>
          </div>
          <div className="space-y-1">
            {items.map((item) => (
              <ItemRow
                key={item.id}
                item={item}
                active={selectedItem?.id === item.id}
                onClick={() => setSelectedItemId(item.id)}
              />
            ))}
            {items.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-6">
                Sem pautas neste calendário.
              </p>
            )}
          </div>
        </Card>

        {/* Painel da pauta selecionada com 4 etapas */}
        {selectedItem ? (
          <CalendarItemPanel item={selectedItem} />
        ) : (
          <Card className="p-8 text-center text-muted-foreground">
            Selecione uma pauta para começar.
          </Card>
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
      : item.stage === "review"
      ? Sparkles
      : item.stage === "design"
      ? ImageIcon
      : item.stage === "briefing"
      ? FileText
      : Circle;
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-lg p-2.5 transition-colors flex items-start gap-2 group",
        active ? "bg-primary/10" : "hover:bg-muted/60"
      )}
    >
      <StageIcon className={cn("h-4 w-4 mt-0.5 shrink-0", active ? "text-primary" : "text-muted-foreground")} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{item.title}</p>
        <div className="flex items-center gap-1.5 mt-1">
          <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", STAGE_COLORS[item.stage])}>
            {STAGE_LABELS[item.stage]}
          </span>
          {item.scheduled_date && (
            <span className="text-[10px] text-muted-foreground">
              {new Date(item.scheduled_date).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}
            </span>
          )}
        </div>
      </div>
    </button>
  );
};

export default CalendarView;
