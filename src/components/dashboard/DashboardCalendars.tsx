import { Link } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Plus, ArrowRight, CheckCircle2, FileText, Image as ImageIcon, Sparkles } from "lucide-react";
import { useCalendars, useCalendarItems, type ContentCalendar } from "@/hooks/useCalendars";
import { motion } from "framer-motion";

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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

const CalendarCard = ({ calendar }: { calendar: ContentCalendar }) => {
  const { data: items = [] } = useCalendarItems(calendar.id);
  const total = items.length;
  const done = items.filter((i) => i.stage === "done").length;
  const briefing = items.filter((i) => i.stage === "briefing").length;
  const design = items.filter((i) => i.stage === "design").length;
  const review = items.filter((i) => i.stage === "review").length;
  const progressPct = total > 0 ? Math.round((done / total) * 100) : 0;

  const refMonth = calendar.reference_month
    ? new Date(calendar.reference_month).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    : null;

  return (
    <Link to={`/calendar/${calendar.id}`} className="block group">
      <Card className="p-4 hover:shadow-md hover:border-primary/30 transition-all h-full">
        <div className="flex items-start justify-between gap-3 mb-3">
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
        <div className="space-y-1.5 mb-3">
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

        {/* Mini badges das etapas */}
        <div className="flex flex-wrap gap-1.5">
          {briefing > 0 && (
            <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 h-5">
              <FileText className="h-2.5 w-2.5" /> {briefing} briefing
            </Badge>
          )}
          {design > 0 && (
            <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 h-5">
              <ImageIcon className="h-2.5 w-2.5" /> {design} design
            </Badge>
          )}
          {review > 0 && (
            <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 h-5">
              <Sparkles className="h-2.5 w-2.5" /> {review} revisão
            </Badge>
          )}
          {done > 0 && (
            <Badge variant="outline" className="text-[10px] gap-1 px-1.5 py-0 h-5 text-success border-success/30">
              <CheckCircle2 className="h-2.5 w-2.5" /> {done} pronto
            </Badge>
          )}
        </div>
      </Card>
    </Link>
  );
};
