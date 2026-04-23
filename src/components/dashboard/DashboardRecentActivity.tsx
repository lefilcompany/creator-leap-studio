import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import {
  History,
  FileText,
  ArrowUpRight,
  Sparkles,
  CheckCircle,
  CalendarDays,
  Video,
  ImageOff,
  ExternalLink,
} from "lucide-react";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ActionSummary {
  id: string;
  type: string;
  created_at: string;
  approved: boolean;
  brand_id: string | null;
  brand_name: string | null;
  image_url: string | null;
  thumb_path: string | null;
  title: string | null;
  platform: string | null;
  objective: string | null;
  total_count: number;
}

interface DashboardRecentActivityProps {
  activities: ActionSummary[];
  isLoading?: boolean;
}

type FilterType = "all" | "CRIAR_CONTEUDO" | "REVISAR_CONTEUDO" | "PLANEJAR_CONTEUDO" | "GERAR_VIDEO";

const filters: { id: FilterType; label: string }[] = [
  { id: "all", label: "Tudo" },
  { id: "CRIAR_CONTEUDO", label: "Criação" },
  { id: "REVISAR_CONTEUDO", label: "Ajustes" },
  { id: "PLANEJAR_CONTEUDO", label: "Calendário" },
  { id: "GERAR_VIDEO", label: "Vídeos" },
];

const formatActionType = (type: string) => {
  const types: Record<string, string> = {
    PLANEJAR_CONTEUDO: "Calendário",
    CRIAR_CONTEUDO: "Conteúdo",
    CRIAR_CONTEUDO_RAPIDO: "Conteúdo rápido",
    REVISAR_CONTEUDO: "Ajuste",
    GERAR_VIDEO: "Vídeo",
  };
  return types[type] || type;
};

const formatRelativeDate = (dateString: string) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "agora";
  if (diffMin < 60) return `${diffMin}min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `há ${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `há ${diffDays}d`;
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
};

const actionConfig: Record<string, { icon: typeof Sparkles; color: string; bg: string }> = {
  CRIAR_CONTEUDO: { icon: Sparkles, color: "text-primary", bg: "bg-primary/10" },
  CRIAR_CONTEUDO_RAPIDO: { icon: Sparkles, color: "text-primary", bg: "bg-primary/10" },
  REVISAR_CONTEUDO: { icon: CheckCircle, color: "text-success", bg: "bg-success/10" },
  PLANEJAR_CONTEUDO: { icon: CalendarDays, color: "text-accent", bg: "bg-accent/10" },
  GERAR_VIDEO: { icon: Video, color: "text-secondary", bg: "bg-secondary/10" },
};

const getImageUrl = (activity: ActionSummary): string | null => {
  if (activity.thumb_path) {
    let path = activity.thumb_path.replace(/^content-images\//, "");
    const { data } = supabase.storage.from("content-images").getPublicUrl(path);
    return data?.publicUrl || null;
  }
  if (activity.image_url) {
    let url = activity.image_url;
    if (url.startsWith("http") || url.startsWith("data:")) return url;
    url = url.replace(/^content-images\//, "");
    const { data } = supabase.storage.from("content-images").getPublicUrl(url);
    return data?.publicUrl || null;
  }
  return null;
};

const getStatusBadge = (approved: boolean) => {
  if (approved) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 text-success px-1.5 py-0.5 text-[10px] font-medium">
        <span className="h-1 w-1 rounded-full bg-success" />
        Aprovado
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-chart-1/15 text-chart-1 px-1.5 py-0.5 text-[10px] font-medium">
      <span className="h-1 w-1 rounded-full bg-chart-1" />
      Pendente
    </span>
  );
};

const ActivityImage = ({ src }: { src: string }) => {
  const [error, setError] = useState(false);
  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/40">
        <ImageOff className="h-4 w-4 text-muted-foreground/50" />
      </div>
    );
  }
  return (
    <img
      src={src}
      alt=""
      className="w-full h-full object-cover"
      loading="lazy"
      draggable={false}
      onError={() => setError(true)}
    />
  );
};

const RowSkeleton = () => (
  <div className="space-y-1">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="flex items-center gap-3 p-3 rounded-xl">
        <Skeleton className="h-12 w-12 rounded-lg shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-1/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
    ))}
  </div>
);

export const DashboardRecentActivity = ({ activities, isLoading }: DashboardRecentActivityProps) => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<FilterType>("all");

  const filtered = useMemo(() => {
    if (filter === "all") return activities;
    if (filter === "CRIAR_CONTEUDO") {
      return activities.filter((a) => a.type === "CRIAR_CONTEUDO" || a.type === "CRIAR_CONTEUDO_RAPIDO");
    }
    return activities.filter((a) => a.type === filter);
  }, [activities, filter]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: 0.15 }}
      className="rounded-2xl border border-border/50 bg-card overflow-hidden"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 sm:px-5 border-b border-border/40">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-muted/60 p-1.5">
            <History className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Atividade recente</h3>
            <p className="text-[11px] text-muted-foreground">
              Últimos conteúdos criados pela equipe
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter chips */}
          <div className="flex items-center gap-1 rounded-full bg-muted/40 p-0.5">
            {filters.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-all ${
                  filter === f.id
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <Link to="/history">
            <Button variant="ghost" size="sm" className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground">
              Ver tudo
              <ArrowUpRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </div>

      {/* List */}
      <div className="p-2 sm:p-3">
        {isLoading ? (
          <RowSkeleton />
        ) : filtered.length > 0 ? (
          <ul className="divide-y divide-border/30">
            {filtered.map((activity) => {
              const config = actionConfig[activity.type] || actionConfig.CRIAR_CONTEUDO;
              const Icon = config.icon;
              const imageUrl = getImageUrl(activity);
              const videoUrl = (activity as any).video_url;

              return (
                <li key={activity.id}>
                  <button
                    onClick={() => navigate(`/action/${activity.id}`)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/40 transition-colors text-left group"
                  >
                    {/* Thumb */}
                    <div className="relative h-12 w-12 rounded-lg overflow-hidden border border-border/40 shrink-0 bg-muted/30">
                      {imageUrl ? (
                        <ActivityImage src={imageUrl} />
                      ) : videoUrl ? (
                        <video
                          src={videoUrl}
                          className="w-full h-full object-cover"
                          muted
                          playsInline
                          preload="metadata"
                          onLoadedData={(e) => {
                            e.currentTarget.currentTime = 1;
                          }}
                        />
                      ) : (
                        <div className={`w-full h-full flex items-center justify-center ${config.bg}`}>
                          <Icon className={`h-4 w-4 ${config.color}`} />
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Icon className={`h-3 w-3 ${config.color} shrink-0`} />
                        <span className="text-[11px] font-medium text-muted-foreground">
                          {formatActionType(activity.type)}
                        </span>
                        <span className="text-[11px] text-muted-foreground/60">·</span>
                        <span className="text-[11px] text-muted-foreground tabular-nums">
                          {formatRelativeDate(activity.created_at)}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground truncate leading-snug">
                        {activity.title || activity.objective || "Sem título"}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                        {activity.brand_name || "Sem marca"}
                        {activity.platform ? ` · ${activity.platform}` : ""}
                      </p>
                    </div>

                    {/* Status + action */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="hidden sm:block">{getStatusBadge(activity.approved)}</div>
                      <div className="rounded-md p-1.5 text-muted-foreground/40 group-hover:text-foreground group-hover:bg-background transition-all">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="py-10 text-center">
            <div className="w-11 h-11 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
              <FileText className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">Nada por aqui ainda</p>
            <p className="text-xs text-muted-foreground mt-1">
              {filter === "all"
                ? "Comece criando seu primeiro conteúdo"
                : "Nenhum item neste filtro"}
            </p>
            {filter === "all" && (
              <Link to="/create">
                <Button size="sm" className="mt-4 h-8 rounded-full gap-1.5 text-xs">
                  <Sparkles className="h-3 w-3" />
                  Criar conteúdo
                </Button>
              </Link>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};
