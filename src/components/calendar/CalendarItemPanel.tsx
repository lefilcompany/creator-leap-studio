import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  CheckCircle2,
  Circle,
  ArrowRight,
  FileText,
  Image as ImageIcon,
  Sparkles,
  Calendar as CalendarIcon,
  Loader2,
  Share2,
  LayoutTemplate,
  StickyNote,
  Tag,
  Save,
  Wand2,
  Pencil,
  Info,
  Check,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useUpdateCalendarItem,
  type CalendarItem,
  type CalendarStage,
} from "@/hooks/useCalendars";
import { useNavigate } from "react-router-dom";

// Mapeia o formato escolhido na pauta para a melhor proporção da imagem
const FORMAT_TO_ASPECT: Record<string, string> = {
  post: "1:1",
  post_fixo: "1:1",
  carrossel: "4:5",
  reels: "9:16",
  story: "9:16",
  video_longo: "16:9",
};

// Tons de voz aceitos no gerador de imagem
const TONE_OPTIONS = [
  "inspirador", "motivacional", "profissional", "casual",
  "elegante", "moderno", "tradicional", "divertido", "sério",
];

// Estilos visuais aceitos no gerador
const VISUAL_STYLE_KEYS = [
  "realistic", "animated", "cartoon", "anime", "watercolor",
  "oil_painting", "digital_art", "sketch", "minimalist", "vintage",
];

// Detecta tons mencionados em um texto livre
function detectTones(text: string): string[] {
  if (!text) return [];
  const lower = text.toLowerCase();
  const found = TONE_OPTIONS.filter((t) => lower.includes(t));
  return Array.from(new Set(found)).slice(0, 4);
}

// Detecta o estilo visual a partir do briefing visual
function detectVisualStyle(text: string): string | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  const map: Array<[string, string[]]> = [
    ["realistic", ["fotorealístico", "fotorealistico", "fotográfic", "fotografic", "realista", "fotografia"]],
    ["animated", ["3d", "pixar", "render 3d", "animado"]],
    ["cartoon", ["cartoon", "desenho animado"]],
    ["anime", ["anime", "mangá", "manga"]],
    ["watercolor", ["aquarela", "watercolor"]],
    ["oil_painting", ["pintura a óleo", "oleo sobre tela", "óleo"]],
    ["digital_art", ["arte digital", "digital art", "ilustração digital"]],
    ["sketch", ["esboço", "sketch", "rascunho", "lápis"]],
    ["minimalist", ["minimalista", "minimalist", "clean", "limpo"]],
    ["vintage", ["vintage", "retrô", "retro", "sépia", "sepia"]],
  ];
  for (const [key, terms] of map) {
    if (terms.some((t) => lower.includes(t))) return key;
  }
  return null;
}

// Heurística para ângulo de câmera baseada em formato/briefing
function detectCameraAngle(format: string | null, brief: string): string {
  const lower = (brief || "").toLowerCase();
  if (lower.includes("close") || lower.includes("close-up")) return "close_up";
  if (lower.includes("aérea") || lower.includes("aerea") || lower.includes("topo") || lower.includes("top down")) return "top_down";
  if (lower.includes("baixo") || lower.includes("low angle")) return "low_angle";
  if (format === "reels" || format === "story") return "eye_level";
  return "eye_level";
}

// Heurística para mood baseada em tom/editoria/briefing
function detectMood(brief: string, tones: string[]): string {
  const lower = (brief || "").toLowerCase();
  if (lower.includes("vibrante") || tones.includes("divertido")) return "vibrant";
  if (lower.includes("elegant") || tones.includes("elegante")) return "elegant";
  if (lower.includes("dramá") || lower.includes("drama")) return "dramatic";
  if (tones.includes("inspirador") || tones.includes("motivacional")) return "inspiring";
  if (tones.includes("sério") || tones.includes("profissional")) return "serious";
  return "auto";
}

interface Step {
  id: CalendarStage;
  label: string;
  icon: typeof CalendarIcon;
  hint: string;
}

// Visual STEPS (banner). "Texto" é apenas um marco visual entre Briefing e Design,
// não corresponde a uma stage real do banco — toda a lógica continua usando stageOrder.
const STEPS: Step[] = [
  {
    id: "calendar",
    label: "Pauta",
    icon: CalendarIcon,
    hint: "Confirme as informações da pauta para iniciar.",
  },
  {
    id: "briefing",
    label: "Briefing",
    icon: FileText,
    hint: "Preencha texto e visual e aprove para liberar o design.",
  },
  {
    id: "text" as CalendarStage,
    label: "Texto",
    icon: Pencil,
    hint: "Geração e ajuste do texto da pauta.",
  },
  {
    id: "design",
    label: "Design",
    icon: ImageIcon,
    hint: "Gere a imagem para concluir esta pauta.",
  },
  {
    id: "done",
    label: "Concluído",
    icon: CheckCircle2,
    hint: "Pauta aprovada e finalizada.",
  },
];

const stageOrder: CalendarStage[] = ["calendar", "briefing", "design", "done"];

// Mapeia uma stage real (stageOrder) para o índice visual em STEPS.
// Como "Texto" é puramente decorativo, "design" pula para o índice 3.
const stageToVisualIndex = (stage: CalendarStage): number => {
  switch (stage) {
    case "calendar": return 0;
    case "briefing": return 1;
    case "design": return 3;
    case "done": return 4;
    default: return 0;
  }
};

export const CalendarItemPanel = ({ item }: { item: CalendarItem }) => {
  const update = useUpdateCalendarItem();
  const maxIndex = stageOrder.indexOf(item.stage);
  const [viewStage, setViewStage] = useState<CalendarStage>(item.stage);

  // Sempre que a etapa real avança (ex.: usuário aprovou e foi promovido),
  // sincroniza a visualização para a nova etapa atual.
  useEffect(() => {
    setViewStage(item.stage);
  }, [item.stage]);

  const currentIndex = stageToVisualIndex(viewStage);
  const visualMaxIndex = stageToVisualIndex(item.stage);
  const currentStep = STEPS[currentIndex] ?? STEPS[0];

  const goToStage = (target: CalendarStage) => {
    const targetIdx = stageOrder.indexOf(target);
    // Bloqueia avanço além da etapa real já alcançada.
    if (targetIdx < 0 || targetIdx > maxIndex) return;
    setViewStage(target);
  };

  const meta = (item.metadata || {}) as Record<string, any>;
  const platform: string | null = meta.platform ?? null;
  const format: string | null = meta.format ?? null;
  const progressPct = Math.round(((visualMaxIndex) / (STEPS.length - 1)) * 100);

  return (
    <div className="rounded-2xl bg-card shadow-sm flex flex-col min-h-[60vh]">
      {/* ===== Header da pauta (centro da experiência) ===== */}
      <div className="px-5 pt-5 pb-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full",
                  item.stage === "done"
                    ? "bg-success/15 text-success"
                    : "bg-primary/10 text-primary"
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    item.stage === "done" ? "bg-success" : "bg-primary"
                  )}
                />
                {currentStep.label}
              </span>
              {item.scheduled_date && (
                <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                  <CalendarIcon className="h-3 w-3" />
                  {new Date(item.scheduled_date).toLocaleDateString("pt-BR", {
                    weekday: "short",
                    day: "2-digit",
                    month: "long",
                  })}
                </span>
              )}
            </div>

            <h1 className="text-xl md:text-2xl font-bold leading-tight tracking-tight">
              {item.title}
            </h1>

            <div className="flex items-center gap-3 mt-2 flex-wrap text-xs text-muted-foreground">
              {platform && (
                <span className="inline-flex items-center gap-1.5">
                  <Share2 className="h-3 w-3" /> {platform}
                </span>
              )}
              {format && (
                <span className="inline-flex items-center gap-1.5">
                  <LayoutTemplate className="h-3 w-3" /> {format}
                </span>
              )}
              {item.theme && (
                <span className="inline-flex items-center gap-1.5">
                  <Tag className="h-3 w-3" /> {item.theme}
                </span>
              )}
            </div>

            {item.notes && (
              <div className="mt-3 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground flex items-start gap-1.5">
                <StickyNote className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span className="whitespace-pre-wrap">{item.notes}</span>
              </div>
            )}
          </div>

          {/* Progresso da pauta (compacto, lado direito) */}
          <div className="hidden md:flex flex-col items-end gap-1 shrink-0">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Progresso
            </span>
            <div className="flex items-center gap-2">
              <div className="w-24 h-1.5 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <span className="text-xs font-semibold tabular-nums">
                {progressPct}%
              </span>
            </div>
          </div>
        </div>

        {/* Stepper */}
        <Stepper
          currentIndex={currentIndex}
          maxIndex={visualMaxIndex}
          stage={item.stage}
          onStepClick={(s) => goToStage(s)}
        />

        {/* Microcopy de orientação */}
        <p className="mt-3 text-xs text-muted-foreground">
          {currentStep.hint}
        </p>
      </div>

      <div className="h-px bg-border/60 mx-5" />

      {/* ===== Conteúdo da etapa ===== */}
      <div className="px-5 py-5 flex-1">
        {viewStage === "calendar" && (
          <StageCalendar
            item={item}
            update={update}
            onAdvance={() =>
              update.mutate({
                id: item.id,
                updates: { calendar_approved: true, stage: "briefing" },
              })
            }
            loading={update.isPending}
          />
        )}
        {viewStage === "briefing" && (
          <StageBriefing item={item} update={update} />
        )}
        {(viewStage === "design" || viewStage === "review") && (
          <StageDesign
            item={item}
            onAdvance={() =>
              update.mutate({
                id: item.id,
                updates: {
                  design_approved: true,
                  final_approved: true,
                  stage: "done",
                },
              })
            }
            loading={update.isPending}
          />
        )}
        {viewStage === "done" && (
          <div className="text-center py-12">
            <div className="mx-auto h-14 w-14 rounded-full bg-success/15 text-success flex items-center justify-center mb-3">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h3 className="font-semibold text-base">Pauta concluída</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Esta pauta passou por todas as etapas do fluxo. Você pode acessá-la
              no histórico a qualquer momento.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ===================== Stepper =====================
const Stepper = ({
  currentIndex,
  maxIndex,
  stage,
  onStepClick,
}: {
  currentIndex: number;
  maxIndex: number;
  stage: CalendarStage;
  onStepClick?: (stage: CalendarStage) => void;
}) => {
  return (
    <div className="flex items-center w-full">
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const isDone = i < maxIndex || stage === "done";
        const isCurrent = i === currentIndex;
        const isReachable = i <= maxIndex;
        const isLast = i === STEPS.length - 1;
        const isDecorative = (step.id as string) === "text";
        const clickable = isReachable && i !== currentIndex && !isDecorative;

        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            <button
              type="button"
              onClick={() => clickable && onStepClick?.(step.id)}
              disabled={!isReachable}
              aria-current={isCurrent ? "step" : undefined}
              title={
                !isReachable
                  ? "Conclua as etapas anteriores para acessar esta"
                  : isCurrent
                  ? `${step.label} (atual)`
                  : `Voltar para ${step.label}`
              }
              className={cn(
                "flex flex-col items-center gap-1.5 min-w-[64px] rounded-lg p-1 -m-1 transition-all",
                clickable && "hover:bg-muted/60 cursor-pointer",
                !isReachable && "cursor-not-allowed opacity-60",
                isCurrent && "cursor-default"
              )}
            >
              <div
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center transition-all duration-300 relative",
                  isDone &&
                    "bg-success text-success-foreground shadow-sm shadow-success/20",
                  isCurrent &&
                    "bg-primary text-primary-foreground shadow-md shadow-primary/30 ring-4 ring-primary/15",
                  !isDone && !isCurrent && "bg-muted text-muted-foreground/50"
                )}
              >
                {isDone ? (
                  <CheckCircle2 className="h-4 w-4" strokeWidth={2.5} />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <span
                className={cn(
                  "text-[10px] font-medium text-center whitespace-nowrap leading-tight",
                  isDone && "text-success",
                  isCurrent && "text-primary font-semibold",
                  !isDone && !isCurrent && "text-muted-foreground/60"
                )}
              >
                {step.label}
              </span>
            </button>
            {!isLast && (
              <div className="flex-1 h-[2px] mx-1 -mt-5 rounded-full overflow-hidden bg-muted">
                <div
                  className={cn(
                    "h-full transition-all duration-500",
                    isDone ? "bg-success w-full" : "w-0"
                  )}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ===================== Sticky Action Bar =====================
const StickyActionBar = ({ children }: { children: React.ReactNode }) => (
  <div className="sticky bottom-0 -mx-5 mt-6 px-5 py-3 bg-card/95 backdrop-blur-sm border-t border-border/60 rounded-b-2xl">
    <div className="flex flex-wrap gap-2 items-center justify-end">{children}</div>
  </div>
);

// ===================== Etapa 1: Calendário =====================
const PLATFORM_OPTIONS = [
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "facebook", label: "Facebook" },
  { value: "youtube", label: "YouTube" },
];

const FORMAT_OPTIONS = [
  { value: "post", label: "Post (feed)" },
  { value: "carrossel", label: "Carrossel" },
  { value: "reels", label: "Reels / Vídeo curto" },
  { value: "story", label: "Story" },
  { value: "video_longo", label: "Vídeo longo" },
  { value: "post_fixo", label: "Post fixo" },
];

const StageCalendar = ({
  item,
  update,
  onAdvance,
  loading,
}: {
  item: CalendarItem;
  update: ReturnType<typeof useUpdateCalendarItem>;
  onAdvance: () => void;
  loading: boolean;
}) => {
  const meta = (item.metadata || {}) as Record<string, any>;

  const [title, setTitle] = useState(item.title);
  const [theme, setTheme] = useState(item.theme || "");
  const [scheduledDate, setScheduledDate] = useState(item.scheduled_date || "");
  const [platform, setPlatform] = useState<string>(meta.platform || "");
  const [format, setFormat] = useState<string>(meta.format || "");
  const [notes, setNotes] = useState(item.notes || "");
  const [editingNotes, setEditingNotes] = useState(false);

  // Sincroniza quando o item recarrega
  useEffect(() => {
    setTitle(item.title);
    setTheme(item.theme || "");
    setScheduledDate(item.scheduled_date || "");
    setPlatform(meta.platform || "");
    setFormat(meta.format || "");
    setNotes(item.notes || "");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  const dirty =
    title !== item.title ||
    theme !== (item.theme || "") ||
    scheduledDate !== (item.scheduled_date || "") ||
    platform !== (meta.platform || "") ||
    format !== (meta.format || "") ||
    notes !== (item.notes || "");

  const persistField = (updates: Record<string, any>) => {
    update.mutate({ id: item.id, updates });
  };

  const handleBlurField = (
    key: "title" | "theme" | "scheduled_date" | "notes",
    current: string,
    original: string
  ) => {
    if (current === original) return;
    if (key === "title" && !current.trim()) {
      setTitle(item.title);
      toast.error("O título não pode ficar vazio.");
      return;
    }
    persistField({ [key]: current });
  };

  const handleMetaChange = (key: "platform" | "format", value: string) => {
    if (key === "platform") setPlatform(value);
    else setFormat(value);
    persistField({
      metadata: { ...(meta || {}), [key]: value || null },
    });
  };

  // Status de preenchimento
  const completed = [title.trim(), scheduledDate, platform, format].filter(Boolean).length;
  const totalRequired = 4;
  const allFilled = completed === totalRequired;

  const handleAdvance = () => {
    if (!allFilled) {
      toast.error("Preencha título, data, rede social e formato antes de avançar.");
      return;
    }
    onAdvance();
  };

  return (
    <div className="space-y-5">
      {/* Header da etapa */}
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 text-primary h-9 w-9 flex items-center justify-center shrink-0">
          <Pencil className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-base">Ajuste os dados da pauta</h3>
            <span className="text-[10px] uppercase font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              Edição direta
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Estes dados alimentam diretamente o briefing de texto e a criação visual nas próximas etapas.
            Edite qualquer campo clicando nele.
          </p>
        </div>
        <div className="hidden sm:flex flex-col items-end shrink-0">
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
            Preenchidos
          </span>
          <span
            className={cn(
              "text-sm font-bold tabular-nums",
              allFilled ? "text-success" : "text-muted-foreground"
            )}
          >
            {completed}/{totalRequired}
          </span>
        </div>
      </div>

      {/* Bloco principal — Título em destaque */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/[0.04] to-card ring-1 ring-primary/10 p-4 md:p-5 space-y-4">
        <div className="space-y-1.5">
          <Label className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold flex items-center gap-1.5">
            Título da pauta
            <Pencil className="h-2.5 w-2.5 opacity-60" />
          </Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => handleBlurField("title", title, item.title)}
            placeholder="Título da pauta"
            className="font-bold text-lg md:text-xl h-12 border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:bg-background focus-visible:px-3 focus-visible:border-2 focus-visible:border-primary/40 rounded-md transition-all"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold flex items-center gap-1.5">
              <CalendarIcon className="h-2.5 w-2.5" />
              Data de publicação
              {scheduledDate ? (
                <Check className="h-2.5 w-2.5 text-success ml-auto" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 ml-auto" />
              )}
            </Label>
            <Input
              type="date"
              value={scheduledDate}
              onChange={(e) => {
                setScheduledDate(e.target.value);
                persistField({ scheduled_date: e.target.value || null });
              }}
              className="h-10"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold flex items-center gap-1.5">
              <Tag className="h-2.5 w-2.5" />
              Tema / Editoria
            </Label>
            <Input
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              onBlur={() => handleBlurField("theme", theme, item.theme || "")}
              placeholder="Ex: Educativo"
              className="h-10"
            />
          </div>
        </div>
      </div>

      {/* Bloco secundário — Distribuição (rede + formato) */}
      <div className="rounded-2xl bg-card ring-1 ring-border/60 p-4 md:p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Share2 className="h-3.5 w-3.5 text-muted-foreground" />
          <h4 className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">
            Distribuição
          </h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              Rede social
              {platform ? (
                <Check className="h-2.5 w-2.5 text-success ml-auto" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 ml-auto" />
              )}
            </Label>
            <Select value={platform} onValueChange={(v) => handleMetaChange("platform", v)}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Selecione a rede" />
              </SelectTrigger>
              <SelectContent>
                {PLATFORM_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              Formato
              {format ? (
                <Check className="h-2.5 w-2.5 text-success ml-auto" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 ml-auto" />
              )}
            </Label>
            <Select value={format} onValueChange={(v) => handleMetaChange("format", v)}>
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Selecione o formato" />
              </SelectTrigger>
              <SelectContent>
                {FORMAT_OPTIONS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Observações — colapsado por padrão */}
      <div className="rounded-2xl bg-card ring-1 ring-border/60 p-4 md:p-5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <StickyNote className="h-3.5 w-3.5 text-muted-foreground" />
            <h4 className="text-xs uppercase tracking-wide font-semibold text-muted-foreground">
              Observações para a equipe
            </h4>
          </div>
          {!editingNotes && (
            <button
              type="button"
              onClick={() => setEditingNotes(true)}
              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
            >
              <Pencil className="h-3 w-3" />
              {notes ? "Editar" : "Adicionar"}
            </button>
          )}
        </div>
        {editingNotes ? (
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => {
              handleBlurField("notes", notes, item.notes || "");
              setEditingNotes(false);
            }}
            autoFocus
            rows={3}
            placeholder="Anotações úteis para quem for produzir o briefing e o design..."
            className="text-sm"
          />
        ) : notes ? (
          <p className="text-sm text-foreground/80 whitespace-pre-wrap">{notes}</p>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            Nenhuma observação. Adicione contexto opcional que ajude a equipe.
          </p>
        )}
      </div>

      {/* CTA final com microcopy explicativo */}
      <div className="rounded-2xl bg-gradient-to-br from-primary/10 via-card to-card ring-1 ring-primary/15 shadow-md p-4 md:p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="rounded-lg bg-primary text-primary-foreground h-10 w-10 flex items-center justify-center shrink-0 shadow-sm shadow-primary/20">
              <ArrowRight className="h-5 w-5" />
            </div>
            <div className="space-y-1 min-w-0">
              <p className="text-sm font-semibold flex items-center gap-1.5">
                Pronto para o próximo passo
                <Info
                  className="h-3.5 w-3.5 text-muted-foreground"
                  aria-label="Ao confirmar, você passará para a criação do briefing e design da pauta"
                />
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Ao confirmar, esta pauta avança para o <strong className="text-foreground">briefing</strong> de texto e imagem.
                Em seguida vem o <strong className="text-foreground">design</strong> e a aprovação final.
                {dirty && (
                  <span className="block mt-1 text-amber-600 dark:text-amber-400">
                    <Save className="inline h-3 w-3 mr-1" />
                    Suas edições estão sendo salvas automaticamente.
                  </span>
                )}
              </p>
            </div>
          </div>
          <Button
            onClick={handleAdvance}
            disabled={loading || !allFilled}
            size="lg"
            className="gap-2 shadow-lg shadow-primary/20 shrink-0 self-stretch md:self-auto"
            title={
              !allFilled
                ? "Preencha título, data, rede social e formato"
                : "Confirmar e seguir para o briefing"
            }
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Confirmar e ir para o briefing
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

// ===================== Etapa 2: Briefing =====================
const StageBriefing = ({
  item,
  update,
}: {
  item: CalendarItem;
  update: ReturnType<typeof useUpdateCalendarItem>;
}) => {
  const [textBrief, setTextBrief] = useState(item.text_briefing || "");
  const [imageBrief, setImageBrief] = useState(item.image_briefing || "");
  const [reviewing, setReviewing] = useState(false);
  const [pautaOpen, setPautaOpen] = useState(false);

  // Status de geração persistido em metadata.briefing_generation
  const meta = (item.metadata || {}) as Record<string, any>;
  const genState = (meta.briefing_generation || {}) as {
    status?: "pending" | "done" | "error";
    kind?: "text" | "image" | "both";
    error?: string;
    updated_at?: string;
  };
  const isGenerating = genState.status === "pending";
  const aiLoading: null | "text" | "image" | "both" = isGenerating
    ? genState.kind || "both"
    : null;

  useEffect(() => {
    setTextBrief(item.text_briefing || "");
    setImageBrief(item.image_briefing || "");
  }, [item.id, item.text_briefing, item.image_briefing]);

  // Polling enquanto a geração está em andamento (sobrevive a sair/voltar da página)
  const qc = useQueryClient();
  useEffect(() => {
    if (!isGenerating) return;
    const interval = setInterval(() => {
      qc.invalidateQueries({ queryKey: ["calendar-items", item.calendar_id] });
    }, 3500);
    return () => clearInterval(interval);
  }, [isGenerating, qc, item.calendar_id]);

  // Notifica conclusão / erro vindos do background
  const lastNotifiedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!genState.status || genState.status === "pending") return;
    const key = `${genState.status}:${genState.updated_at || ""}`;
    if (lastNotifiedRef.current === key) return;
    lastNotifiedRef.current = key;
    if (genState.status === "done") {
      toast.success("Briefing gerado pela IA");
    } else if (genState.status === "error") {
      toast.error(genState.error || "Não foi possível gerar com IA");
    }
  }, [genState.status, genState.updated_at, genState.error]);

  const handleSave = () => {
    update.mutate(
      {
        id: item.id,
        updates: { text_briefing: textBrief, image_briefing: imageBrief },
      },
      {
        onSuccess: () => toast.success("Rascunho salvo"),
      }
    );
  };

  const handleApprove = () => {
    update.mutate({
      id: item.id,
      updates: {
        text_briefing: textBrief,
        image_briefing: imageBrief,
        briefing_approved: true,
        briefing_approved_at: new Date().toISOString(),
        stage: "design",
      },
    });
  };

  const handleGenerateAI = async (kind: "text" | "image" | "both") => {
    try {
      // Modo background: a edge function persiste direto no banco e
      // continua mesmo se o usuário sair da página.
      const { data, error } = await supabase.functions.invoke(
        "generate-item-briefing",
        {
          body: { item_id: item.id, kind },
        }
      );
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.info("Geração iniciada — você pode continuar navegando.");
      // Refresca pra capturar o status "pending" persistido
      qc.invalidateQueries({ queryKey: ["calendar-items", item.calendar_id] });
    } catch (e: any) {
      console.error("AI briefing error", e);
      toast.error(e?.message || "Não foi possível iniciar a geração");
    }
  };

  const textReady = textBrief.trim().length >= 10;
  const imageReady = imageBrief.trim().length >= 10;
  const canApprove = textReady && imageReady;
  const completedCount = (textReady ? 1 : 0) + (imageReady ? 1 : 0);
  const progressPct = Math.round((completedCount / 2) * 100);

  // ===== Tela de aprovação =====
  if (reviewing) {
    const meta = (item.metadata || {}) as Record<string, any>;
    const platform: string | null = meta.platform ?? null;
    const format: string | null = meta.format ?? null;

    return (
      <div className="space-y-5">
        <div className="text-center space-y-1.5">
          <div className="mx-auto h-12 w-12 rounded-full bg-success/15 text-success flex items-center justify-center mb-2">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h3 className="font-semibold text-base">Pronto para aprovar?</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Confira o resumo abaixo. Após aprovar, a pauta avança automaticamente
            para a etapa de design.
          </p>
        </div>

        <div className="rounded-xl bg-muted/30 p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{item.title}</span>
            {platform && (
              <span className="inline-flex items-center gap-1">
                <Share2 className="h-3 w-3" /> {platform}
              </span>
            )}
            {format && (
              <span className="inline-flex items-center gap-1">
                <LayoutTemplate className="h-3 w-3" /> {format}
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg bg-card p-3 shadow-sm">
              <p className="font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wider">
                <FileText className="h-3 w-3" /> Texto / legenda
              </p>
              <p className="line-clamp-6 whitespace-pre-wrap text-foreground/90">
                {textBrief}
              </p>
            </div>
            <div className="rounded-lg bg-card p-3 shadow-sm">
              <p className="font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5 text-[10px] uppercase tracking-wider">
                <ImageIcon className="h-3 w-3" /> Visual / imagem
              </p>
              <p className="line-clamp-6 whitespace-pre-wrap text-foreground/90">
                {imageBrief}
              </p>
            </div>
          </div>
        </div>

        <StickyActionBar>
          <Button
            variant="ghost"
            onClick={() => setReviewing(false)}
            disabled={update.isPending}
          >
            Voltar e ajustar
          </Button>
          <Button
            size="lg"
            onClick={handleApprove}
            disabled={update.isPending}
            className="gap-2"
          >
            {update.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            Aprovar e ir para o design
            <ArrowRight className="h-4 w-4" />
          </Button>
        </StickyActionBar>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho estratégico: contexto + progresso */}
      <div className="rounded-2xl border border-primary/15 bg-gradient-to-br from-primary/8 via-primary/4 to-transparent p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-primary text-primary-foreground p-2.5 shrink-0 shadow-md shadow-primary/20">
            <Wand2 className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-semibold leading-tight">
                Briefing assistido por IA
              </h3>
              <span className="text-[10px] font-semibold uppercase tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                Etapa 2 de 4
              </span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed max-w-2xl">
              A IA cruza marca, persona, editoria, formato e rede social para
              gerar os dois briefings de uma vez. Você pode editar livremente
              antes de aprovar — o que estiver aqui guia o design final.
            </p>
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={() => handleGenerateAI("both")}
            disabled={aiLoading !== null}
            className="gap-2 shrink-0 shadow-md shadow-primary/20"
          >
            {aiLoading === "both" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Gerar tudo com IA
          </Button>
        </div>

        {/* Progresso por campo */}
        <div className="mt-4 pt-4 border-t border-primary/10">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-foreground/80">
              Progresso do briefing
            </span>
            <span className="text-xs font-semibold text-primary">
              {completedCount}/2 prontos · {progressPct}%
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-primary/10 overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              {textReady ? (
                <CheckCircle2 className="h-3 w-3 text-success" />
              ) : (
                <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
              )}
              Texto / legenda
            </span>
            <span className="inline-flex items-center gap-1">
              {imageReady ? (
                <CheckCircle2 className="h-3 w-3 text-success" />
              ) : (
                <span className="h-2 w-2 rounded-full bg-muted-foreground/30" />
              )}
              Visual / imagem
            </span>
          </div>
        </div>
      </div>

      {/* Resumo da Pauta (sanfona) */}
      {(() => {
        const m = (item.metadata || {}) as Record<string, any>;
        const fields: { label: string; value: string | null | undefined }[] = [
          { label: "Título", value: item.title },
          { label: "Tema / editoria", value: item.theme },
          {
            label: "Data",
            value: item.scheduled_date
              ? new Date(item.scheduled_date + "T00:00:00").toLocaleDateString("pt-BR", {
                  weekday: "long",
                  day: "2-digit",
                  month: "long",
                })
              : null,
          },
          { label: "Rede social", value: m.platform },
          { label: "Formato", value: m.format },
          { label: "Observações", value: item.notes },
        ];
        const filled = fields.filter((f) => f.value && String(f.value).trim().length > 0);
        if (filled.length === 0) return null;
        return (
          <div className="rounded-2xl border border-border bg-muted/20 overflow-hidden">
            <button
              type="button"
              onClick={() => setPautaOpen((v) => !v)}
              className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <div className="rounded-lg bg-primary/10 text-primary p-1.5 shrink-0">
                  <Pencil className="h-3.5 w-3.5" />
                </div>
                <div className="text-left min-w-0">
                  <p className="text-xs font-semibold">Dados da pauta</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {pautaOpen
                      ? "Tudo o que você preencheu na etapa anterior"
                      : filled
                          .slice(0, 3)
                          .map((f) => `${f.label}: ${f.value}`)
                          .join(" · ")}
                  </p>
                </div>
              </div>
              <ChevronDown
                className={cn(
                  "h-4 w-4 text-muted-foreground shrink-0 transition-transform",
                  pautaOpen && "rotate-180"
                )}
              />
            </button>
            {pautaOpen && (
              <div className="px-4 pb-4 pt-1 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-border/60">
                {filled.map((f) => (
                  <div key={f.label} className="text-xs">
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-0.5">
                      {f.label}
                    </p>
                    <p className="whitespace-pre-wrap text-foreground/90 leading-relaxed">
                      {f.value}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Campos lado a lado */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <BriefingField
          icon={FileText}
          title="Briefing de texto / legenda"
          stepLabel="1 · Copy"
          description="Mensagem central, gatilho de abertura, tom de voz, CTA e hashtags. Vai virar a legenda do post."
          aiHelper="A IA escreve uma proposta usando marca, persona e tema. Você refina depois."
          placeholder="Ex: Mensagem principal, ângulo, tom de voz, chamada para ação, hashtags relevantes..."
          value={textBrief}
          ready={textReady}
          onChange={setTextBrief}
          onAI={() => handleGenerateAI("text")}
          aiLoading={aiLoading === "text"}
          aiDisabled={aiLoading !== null}
        />
        <BriefingField
          icon={ImageIcon}
          title="Briefing visual / imagem"
          stepLabel="2 · Arte"
          description="Cena, elementos, paleta, estilo, enquadramento e o que NÃO deve aparecer. Guia direto da imagem."
          aiHelper="A IA propõe uma direção de arte fiel à marca. Ajuste cenário, mood e detalhes."
          placeholder="Ex: Cenário, personagens, paleta, estilo fotográfico, ângulo, mood, elementos a evitar..."
          value={imageBrief}
          ready={imageReady}
          onChange={setImageBrief}
          onAI={() => handleGenerateAI("image")}
          aiLoading={aiLoading === "image"}
          aiDisabled={aiLoading !== null}
        />
      </div>

      {/* Painel de conclusão contextual */}
      <div
        className={cn(
          "rounded-2xl border p-4 transition-colors",
          canApprove
            ? "border-success/30 bg-success/5"
            : "border-border bg-muted/30"
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className={cn(
              "rounded-lg p-2 shrink-0",
              canApprove
                ? "bg-success/15 text-success"
                : "bg-muted text-muted-foreground"
            )}
          >
            {canApprove ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">
              {canApprove
                ? "Briefing pronto para aprovação"
                : "Complete os dois briefings para avançar"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              {canApprove
                ? "Você verá um resumo antes de confirmar. Após aprovar, a pauta avança para o design."
                : "Os dois campos precisam de pelo menos uma direção clara para a IA gerar o design correto."}
            </p>
          </div>
        </div>
      </div>

      <StickyActionBar>
        <Button
          size="lg"
          onClick={() => {
            update.mutate({
              id: item.id,
              updates: {
                text_briefing: textBrief,
                image_briefing: imageBrief,
              },
            });
            setReviewing(true);
          }}
          disabled={!canApprove || update.isPending}
          className="gap-2 shadow-md shadow-primary/20"
          title={
            !canApprove
              ? "Preencha texto e visual para concluir o briefing"
              : undefined
          }
        >
          <CheckCircle2 className="h-4 w-4" />
          Revisar e aprovar briefing
          <ArrowRight className="h-4 w-4" />
        </Button>
      </StickyActionBar>
    </div>
  );
};

// Campo de briefing premium reutilizável
const BriefingField = ({
  icon: Icon,
  title,
  stepLabel,
  description,
  aiHelper,
  placeholder,
  value,
  ready,
  onChange,
  onAI,
  aiLoading,
  aiDisabled,
}: {
  icon: typeof CalendarIcon;
  title: string;
  stepLabel?: string;
  description: string;
  aiHelper?: string;
  placeholder: string;
  value: string;
  ready?: boolean;
  onChange: (v: string) => void;
  onAI: () => void;
  aiLoading: boolean;
  aiDisabled: boolean;
}) => {
  const charCount = value.length;
  return (
    <div
      className={cn(
        "rounded-2xl border-2 bg-card p-4 transition-all",
        "focus-within:border-primary focus-within:shadow-lg focus-within:shadow-primary/10",
        ready ? "border-success/40" : "border-border"
      )}
    >
      {/* Cabeçalho do campo */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <div
              className={cn(
                "rounded-md p-1.5 shrink-0",
                ready
                  ? "bg-success/15 text-success"
                  : "bg-primary/10 text-primary"
              )}
            >
              {ready ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <Icon className="h-3.5 w-3.5" />
              )}
            </div>
            {stepLabel && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {stepLabel}
              </span>
            )}
            <span
              className={cn(
                "ml-auto text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full",
                ready
                  ? "bg-success/15 text-success"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {ready ? "Pronto" : "Pendente"}
            </span>
          </div>
          <h4 className="text-sm font-semibold leading-tight">{title}</h4>
          <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
            {description}
          </p>
        </div>
      </div>

      {/* Ação IA com microcopy */}
      <div className="flex items-center justify-between gap-2 mb-2 px-0.5">
        <p className="text-[10px] text-muted-foreground italic flex-1 min-w-0 truncate">
          {aiHelper}
        </p>
        <button
          type="button"
          onClick={onAI}
          disabled={aiDisabled}
          className="shrink-0 inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-[11px] font-semibold text-primary bg-primary/10 hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {aiLoading ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            <Sparkles className="h-3 w-3" />
          )}
          Gerar com IA
        </button>
      </div>

      <Textarea
        rows={9}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="border border-border/60 bg-background focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary text-sm leading-relaxed resize-none rounded-xl"
      />
      <div className="flex items-center justify-between px-1 pt-2">
        <span className="text-[10px] text-muted-foreground">
          {charCount === 0
            ? "Nenhum conteúdo ainda — gere com IA ou escreva manualmente"
            : `${charCount} caracteres`}
        </span>
        {charCount > 0 && charCount < 10 && (
          <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400">
            Adicione mais detalhes
          </span>
        )}
        {ready && (
          <span className="text-[10px] font-medium text-success inline-flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Pronto para usar
          </span>
        )}
      </div>
    </div>
  );
};

// ===================== Etapa 3: Design =====================
const StageDesign = ({
  item,
  onAdvance,
  loading,
}: {
  item: CalendarItem;
  onAdvance: () => void;
  loading: boolean;
}) => {
  const navigate = useNavigate();
  const [opening, setOpening] = useState(false);
  const [textExpanded, setTextExpanded] = useState(false);
  const [imageExpanded, setImageExpanded] = useState(false);

  const handleOpenGenerator = async () => {
    try {
      setOpening(true);
      const meta = (item.metadata || {}) as Record<string, any>;
      const platform: string | null = meta.platform ?? null;
      const format: string | null = meta.format ?? null;
      const aspectRatio = format ? FORMAT_TO_ASPECT[format] ?? "1:1" : "1:1";

      const { data: cal } = await supabase
        .from("content_calendars")
        .select("brand_id, persona_id, theme_id, name, user_input")
        .eq("id", item.calendar_id)
        .maybeSingle();

      const [personaRes, themeRes] = await Promise.all([
        cal?.persona_id
          ? supabase
              .from("personas")
              .select("name, preferred_tone_of_voice, main_goal, challenges")
              .eq("id", cal.persona_id)
              .maybeSingle()
          : Promise.resolve({ data: null as any }),
        cal?.theme_id
          ? supabase
              .from("strategic_themes")
              .select(
                "title, tone_of_voice, target_audience, color_palette, content_format"
              )
              .eq("id", cal.theme_id)
              .maybeSingle()
          : Promise.resolve({ data: null as any }),
      ]);

      const persona = personaRes?.data ?? null;
      const themeRow = themeRes?.data ?? null;

      const toneSource = [
        persona?.preferred_tone_of_voice ?? "",
        themeRow?.tone_of_voice ?? "",
        item.image_briefing ?? "",
        item.text_briefing ?? "",
      ].join(" ");
      const tone = detectTones(toneSource);

      const detectedStyle = detectVisualStyle(item.image_briefing ?? "");
      const visualStyle =
        detectedStyle && VISUAL_STYLE_KEYS.includes(detectedStyle)
          ? detectedStyle
          : "realistic";

      const cameraAngle = detectCameraAngle(format, item.image_briefing ?? "");
      const mood = detectMood(item.image_briefing ?? "", tone);

      const promptParts = [
        `Pauta: ${item.title}`,
        item.theme ? `Tema/Editoria: ${item.theme}` : "",
        persona?.name ? `Ponto de vista (persona): ${persona.name}` : "",
        item.image_briefing ? `\nBriefing visual:\n${item.image_briefing}` : "",
      ].filter(Boolean);
      const prompt = promptParts.join("\n");

      const additionalParts = [
        item.text_briefing ? `Briefing de legenda:\n${item.text_briefing}` : "",
        persona?.main_goal ? `Objetivo da persona: ${persona.main_goal}` : "",
        themeRow?.target_audience
          ? `Público-alvo: ${themeRow.target_audience}`
          : "",
        item.notes ? `Observações:\n${item.notes}` : "",
        item.scheduled_date
          ? `Data de publicação: ${new Date(
              item.scheduled_date
            ).toLocaleDateString("pt-BR")}`
          : "",
      ].filter(Boolean);
      const additionalInfo = additionalParts.join("\n\n");

      const prefillData: Record<string, any> = {
        brandId: cal?.brand_id ?? undefined,
        personaId: cal?.persona_id ?? undefined,
        themeId: cal?.theme_id ?? undefined,
        prompt,
        additionalInfo,
        platform: platform ?? undefined,
        aspectRatio,
        contentType: "organic",
        tone: tone.length > 0 ? tone : undefined,
        visualStyle,
        cameraAngle,
        mood,
        composition: "auto",
        lighting: "natural",
      };

      navigate("/create/image", { state: { prefillData } });
    } catch (e: any) {
      console.error("open generator error", e);
      toast.error("Não foi possível abrir o gerador com o briefing.");
    } finally {
      setOpening(false);
    }
  };

  const hasGeneratedImage = !!item.design_action_id;

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-semibold text-sm">Criação da imagem</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          Use o briefing aprovado para gerar a imagem na ferramenta de criação.
          Todos os campos serão preenchidos automaticamente.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl bg-muted/30 p-4">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
            <FileText className="h-3 w-3" /> Briefing de texto
          </p>
          <p
            className={cn(
              "text-sm whitespace-pre-wrap text-foreground/90 leading-relaxed",
              !textExpanded && "max-h-48 overflow-hidden [mask-image:linear-gradient(to_bottom,black_70%,transparent)]"
            )}
          >
            {item.text_briefing}
          </p>
          {(item.text_briefing?.length ?? 0) > 280 && (
            <button
              type="button"
              onClick={() => setTextExpanded((v) => !v)}
              className="mt-2 text-xs font-semibold text-primary hover:underline"
            >
              {textExpanded ? "Recolher" : "Sofona — exibir tudo"}
            </button>
          )}
        </div>
        <div className="rounded-xl bg-muted/30 p-4">
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
            <ImageIcon className="h-3 w-3" /> Briefing visual
          </p>
          <p
            className={cn(
              "text-sm whitespace-pre-wrap text-foreground/90 leading-relaxed",
              !imageExpanded && "max-h-48 overflow-hidden [mask-image:linear-gradient(to_bottom,black_70%,transparent)]"
            )}
          >
            {item.image_briefing}
          </p>
          {(item.image_briefing?.length ?? 0) > 280 && (
            <button
              type="button"
              onClick={() => setImageExpanded((v) => !v)}
              className="mt-2 text-xs font-semibold text-primary hover:underline"
            >
              {imageExpanded ? "Recolher" : "Sofona — exibir tudo"}
            </button>
          )}
        </div>
      </div>

      <div
        className={cn(
          "rounded-xl border px-4 py-3 text-xs flex items-start gap-2",
          hasGeneratedImage
            ? "bg-success/8 border-success/20 text-success"
            : "bg-amber-500/8 border-amber-500/20 text-amber-700 dark:text-amber-400"
        )}
      >
        {hasGeneratedImage ? (
          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
        ) : (
          <Circle className="h-4 w-4 mt-0.5 shrink-0" />
        )}
        <p>
          {hasGeneratedImage
            ? "Imagem criada com sucesso. Você pode marcar como concluída ou gerar uma nova versão."
            : "Gere a imagem para liberar a conclusão. A próxima etapa só fica disponível após a criação."}
        </p>
      </div>

      <StickyActionBar>
        {hasGeneratedImage ? (
          <>
            <Button
              variant="ghost"
              onClick={handleOpenGenerator}
              disabled={opening}
              className="gap-2"
            >
              {opening ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Gerar nova imagem
            </Button>
            <Button onClick={onAdvance} disabled={loading} className="gap-2">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              Concluir pauta
              <ArrowRight className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Button
            onClick={handleOpenGenerator}
            disabled={opening}
            className="gap-2"
          >
            {opening ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Abrir gerador de imagens
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </StickyActionBar>
    </div>
  );
};
