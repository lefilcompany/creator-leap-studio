import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { History, FileText, ArrowRight } from "lucide-react";

interface Activity {
  id: string;
  type: string;
  status: string;
  created_at: string;
  brand_id: string | null;
  brands: { name: string } | null;
}

interface DashboardRecentActivityProps {
  activities: Activity[];
}

const formatActionType = (type: string) => {
  const types: Record<string, string> = {
    'quick_content': 'Conteúdo Criado',
    'content_suggestion': 'Sugestão de Conteúdo',
    'content_plan': 'Calendário Planejado',
    'content_review': 'Conteúdo Revisado',
    'PLANEJAR_CONTEUDO': 'Planejar Conteúdo',
    'CRIAR_CONTEUDO': 'Criar Conteúdo',
    'CRIAR_CONTEUDO_RAPIDO': 'Conteúdo Rápido',
    'SUGERIR_CONTEUDO': 'Sugerir Conteúdo',
    'REVISAR_CONTEUDO': 'Revisar Conteúdo',
    'GERAR_VIDEO': 'Gerar Vídeo',
  };
  if (types[type]) return types[type];
  return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
};

const formatRelativeDate = (dateString: string) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "agora mesmo";
  if (diffMin < 60) return `${diffMin}min atrás`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h atrás`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d atrás`;
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
};

const actionColors: Record<string, string> = {
  'CRIAR_CONTEUDO': 'bg-primary/15 text-primary',
  'CRIAR_CONTEUDO_RAPIDO': 'bg-primary/15 text-primary',
  'REVISAR_CONTEUDO': 'bg-success/15 text-success',
  'PLANEJAR_CONTEUDO': 'bg-accent/15 text-accent',
  'GERAR_VIDEO': 'bg-secondary/15 text-secondary',
};

export const DashboardRecentActivity = ({ activities }: DashboardRecentActivityProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      <Card className="border-0 shadow-lg overflow-hidden">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-muted/80">
              <History className="h-4 w-4 text-muted-foreground" />
            </div>
            <CardTitle className="text-base font-semibold">Atividade Recente</CardTitle>
          </div>
          <Link to="/history">
            <Button variant="ghost" size="sm" className="text-xs text-muted-foreground hover:text-primary gap-1">
              Ver tudo <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </CardHeader>

        <CardContent className="p-0">
          {activities.length > 0 ? (
            <div className="divide-y divide-border/30">
              {activities.map((activity: any, index: number) => {
                const colorClass = actionColors[activity.type] || 'bg-muted/50 text-muted-foreground';
                return (
                  <motion.div
                    key={activity.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + index * 0.08 }}
                    className="flex items-center gap-3 px-6 py-3.5 hover:bg-muted/20 transition-colors group"
                  >
                    <div className={`p-2 rounded-lg ${colorClass} shrink-0`}>
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {formatActionType(activity.type)}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {activity.brands?.name || 'Sem marca'}
                      </p>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatRelativeDate(activity.created_at)}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <div className="py-10 text-center px-6">
              <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">Nenhuma atividade ainda</p>
              <p className="text-xs text-muted-foreground mt-1">
                Comece criando seu primeiro conteúdo!
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};
