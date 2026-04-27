import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useUpdateCalendarItem,
  type CalendarItem,
  type CalendarStage,
} from "@/hooks/useCalendars";
import { Link } from "react-router-dom";

interface Step {
  id: CalendarStage;
  label: string;
  icon: typeof CalendarIcon;
}

const STEPS: Step[] = [
  { id: "calendar", label: "Calendário", icon: CalendarIcon },
  { id: "briefing", label: "Briefing", icon: FileText },
  { id: "design", label: "Design", icon: ImageIcon },
  { id: "review", label: "Revisão", icon: Sparkles },
];

const stageOrder: CalendarStage[] = ["calendar", "briefing", "design", "review", "done"];

export const CalendarItemPanel = ({ item }: { item: CalendarItem }) => {
  const update = useUpdateCalendarItem();
  const currentIndex = stageOrder.indexOf(item.stage);

  const meta = (item.metadata || {}) as Record<string, any>;
  const platform: string | null = meta.platform ?? null;
  const format: string | null = meta.format ?? null;

  return (
    <Card className="p-5 space-y-5">
      {/* Cabeçalho da pauta */}
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 w-full">
            <h2 className="text-lg font-bold">{item.title}</h2>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {item.scheduled_date && (
                <Badge variant="outline" className="gap-1 text-xs">
                  <CalendarIcon className="h-3 w-3" />
                  {new Date(item.scheduled_date).toLocaleDateString("pt-BR", {
                    weekday: "short",
                    day: "2-digit",
                    month: "long",
                  })}
                </Badge>
              )}
              {platform && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <Share2 className="h-3 w-3" /> {platform}
                </Badge>
              )}
              {format && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  <LayoutTemplate className="h-3 w-3" /> {format}
                </Badge>
              )}
              {item.theme && (
                <Badge variant="outline" className="text-xs">{item.theme}</Badge>
              )}
            </div>
            {item.notes && (
              <p className="text-xs text-muted-foreground mt-2 flex items-start gap-1.5">
                <StickyNote className="h-3 w-3 mt-0.5 shrink-0" />
                <span className="whitespace-pre-wrap">{item.notes}</span>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-1 px-1">
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          const isDone = i < currentIndex || item.stage === "done";
          const isCurrent = i === currentIndex;
          return (
            <div key={step.id} className="flex items-center flex-1">
              <div
                className={cn(
                  "flex flex-col items-center gap-1 flex-1",
                  (isDone || isCurrent) ? "opacity-100" : "opacity-50"
                )}
              >
                <div
                  className={cn(
                    "h-8 w-8 rounded-full flex items-center justify-center transition-colors",
                    isDone
                      ? "bg-success/15 text-success"
                      : isCurrent
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span className="text-[10px] font-medium text-center">{step.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn("h-0.5 flex-1 -mt-4", isDone ? "bg-success/40" : "bg-border")} />
              )}
            </div>
          );
        })}
      </div>

      {/* Conteúdo da etapa */}
      <div className="border-t pt-5">
        {item.stage === "calendar" && (
          <StageCalendar item={item} onAdvance={() => update.mutate({ id: item.id, updates: { calendar_approved: true, stage: "briefing" } })} loading={update.isPending} />
        )}
        {item.stage === "briefing" && (
          <StageBriefing item={item} update={update} />
        )}
        {item.stage === "design" && (
          <StageDesign item={item} onAdvance={() => update.mutate({ id: item.id, updates: { design_approved: true, stage: "review" } })} loading={update.isPending} />
        )}
        {item.stage === "review" && (
          <StageReview item={item} onAdvance={() => update.mutate({ id: item.id, updates: { final_approved: true, stage: "done" } })} loading={update.isPending} />
        )}
        {item.stage === "done" && (
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 text-success mx-auto mb-3" />
            <h3 className="font-semibold">Pauta concluída!</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Esta pauta passou por todas as etapas do fluxo.
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};

// ===== Etapa 1: Calendário =====
const StageCalendar = ({
  item,
  onAdvance,
  loading,
}: {
  item: CalendarItem;
  onAdvance: () => void;
  loading: boolean;
}) => {
  const meta = (item.metadata || {}) as Record<string, any>;
  const platform: string | null = meta.platform ?? null;
  const format: string | null = meta.format ?? null;

  return (
  <div className="space-y-4">
    <div>
      <h3 className="font-semibold text-sm mb-1">Pauta confirmada</h3>
      <p className="text-sm text-muted-foreground">
        Confira a pauta e confirme para avançar para a criação do briefing.
      </p>
    </div>
    <div className="rounded-lg bg-muted/40 p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Field label="Título" value={item.title} full />
      {item.theme && <Field label="Tema / Editoria" value={item.theme} />}
      {item.scheduled_date && (
        <Field
          label="Data"
          value={new Date(item.scheduled_date).toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}
        />
      )}
      <Field label="Rede social" value={platform || "—"} />
      <Field label="Formato" value={format || "—"} />
      {item.notes && <Field label="Observações" value={item.notes} full />}
    </div>
    <Button onClick={onAdvance} disabled={loading} className="gap-2 w-full sm:w-auto">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
      Confirmar e ir para o briefing
      <ArrowRight className="h-4 w-4" />
    </Button>
  </div>
  );
};

const Field = ({ label, value, full }: { label: string; value: string; full?: boolean }) => (
  <div className={cn("min-w-0", full && "sm:col-span-2")}>
    <p className="text-[11px] uppercase tracking-wide font-medium text-muted-foreground">{label}</p>
    <p className="text-sm mt-0.5 whitespace-pre-wrap break-words">{value}</p>
  </div>
);

// ===== Etapa 2: Briefing =====
const StageBriefing = ({
  item,
  update,
}: {
  item: CalendarItem;
  update: ReturnType<typeof useUpdateCalendarItem>;
}) => {
  const [textBrief, setTextBrief] = useState(item.text_briefing || "");
  const [imageBrief, setImageBrief] = useState(item.image_briefing || "");
  const [aiLoading, setAiLoading] = useState<null | "text" | "image" | "both">(null);
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    setTextBrief(item.text_briefing || "");
    setImageBrief(item.image_briefing || "");
  }, [item.id, item.text_briefing, item.image_briefing]);

  const handleSave = () => {
    update.mutate({
      id: item.id,
      updates: { text_briefing: textBrief, image_briefing: imageBrief },
    });
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
      setAiLoading(kind);
      const meta = (item.metadata || {}) as Record<string, any>;

      // Carrega contexto completo do calendário (marca, persona, editoria)
      const { data: cal } = await supabase
        .from("content_calendars")
        .select("name, description, user_input, reference_month, brand_id, persona_id, theme_id")
        .eq("id", item.calendar_id)
        .maybeSingle();

      const [brandRes, personaRes, themeRes] = await Promise.all([
        cal?.brand_id
          ? supabase.from("brands").select("name, segment, values, keywords, promise, goals, brand_color").eq("id", cal.brand_id).maybeSingle()
          : Promise.resolve({ data: null }),
        cal?.persona_id
          ? supabase.from("personas").select("name, age, main_goal, challenges, preferred_tone_of_voice").eq("id", cal.persona_id).maybeSingle()
          : Promise.resolve({ data: null }),
        cal?.theme_id
          ? supabase.from("strategic_themes").select("title, description, tone_of_voice, target_audience, color_palette, objectives, hashtags").eq("id", cal.theme_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      const { data, error } = await supabase.functions.invoke("generate-item-briefing", {
        body: {
          kind,
          item: {
            title: item.title,
            theme: item.theme,
            scheduled_date: item.scheduled_date,
            platform: meta.platform ?? null,
            format: meta.format ?? null,
            notes: item.notes,
          },
          calendar: cal
            ? {
                name: cal.name,
                description: cal.description,
                user_input: cal.user_input,
                reference_month: cal.reference_month,
              }
            : null,
          brand: brandRes?.data ?? null,
          persona: personaRes?.data ?? null,
          theme: themeRes?.data ?? null,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if ((kind === "text" || kind === "both") && data?.text_briefing) {
        setTextBrief(data.text_briefing);
      }
      if ((kind === "image" || kind === "both") && data?.image_briefing) {
        setImageBrief(data.image_briefing);
      }
      toast.success("Briefing gerado pela IA");
    } catch (e: any) {
      console.error("AI briefing error", e);
      toast.error(e?.message || "Não foi possível gerar com IA");
    } finally {
      setAiLoading(null);
    }
  };

  const canApprove = textBrief.trim().length > 10 && imageBrief.trim().length > 10;

  // ===== Tela simplificada de aprovação =====
  if (reviewing) {
    const meta = (item.metadata || {}) as Record<string, any>;
    const platform: string | null = meta.platform ?? null;
    const format: string | null = meta.format ?? null;

    return (
      <div className="space-y-5">
        <div className="text-center space-y-1">
          <div className="mx-auto h-12 w-12 rounded-full bg-success/15 text-success flex items-center justify-center mb-2">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h3 className="font-semibold text-base">Pronto para aprovar?</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Confira o resumo abaixo. Após aprovar, a pauta avança para a etapa de design.
          </p>
        </div>

        <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-xs">{item.title}</Badge>
            {platform && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <Share2 className="h-3 w-3" /> {platform}
              </Badge>
            )}
            {format && (
              <Badge variant="secondary" className="gap-1 text-xs">
                <LayoutTemplate className="h-3 w-3" /> {format}
              </Badge>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="rounded-lg bg-background/60 p-3">
              <p className="font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
                <FileText className="h-3 w-3" /> Texto / legenda
              </p>
              <p className="line-clamp-4 whitespace-pre-wrap text-foreground/90">{textBrief}</p>
            </div>
            <div className="rounded-lg bg-background/60 p-3">
              <p className="font-medium text-muted-foreground mb-1 flex items-center gap-1.5">
                <ImageIcon className="h-3 w-3" /> Visual / imagem
              </p>
              <p className="line-clamp-4 whitespace-pre-wrap text-foreground/90">{imageBrief}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-between">
          <Button variant="ghost" onClick={() => setReviewing(false)} disabled={update.isPending}>
            Voltar e ajustar
          </Button>
          <Button
            size="lg"
            onClick={handleApprove}
            disabled={update.isPending}
            className="gap-2"
          >
            {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Aprovar briefing
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h3 className="font-semibold text-sm mb-1">Briefing de texto e imagem</h3>
          <p className="text-sm text-muted-foreground">
            Use a IA para gerar com base em tudo que foi cadastrado no calendário (marca, persona, editoria, formato e rede social) ou ajuste manualmente.
          </p>
        </div>
        <Button
          variant="default"
          size="sm"
          onClick={() => handleGenerateAI("both")}
          disabled={aiLoading !== null}
          className="gap-2"
        >
          {aiLoading === "both" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          Gerar ambos com IA
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Briefing de texto / legenda
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleGenerateAI("text")}
              disabled={aiLoading !== null}
              className="gap-1.5 h-7 text-xs"
            >
              {aiLoading === "text" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              Gerar com IA
            </Button>
          </div>
          <Textarea
            rows={9}
            value={textBrief}
            onChange={(e) => setTextBrief(e.target.value)}
            placeholder="O que a legenda deve comunicar, tom de voz, CTA..."
          />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <label className="text-sm font-medium flex items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5" /> Briefing visual / imagem
            </label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleGenerateAI("image")}
              disabled={aiLoading !== null}
              className="gap-1.5 h-7 text-xs"
            >
              {aiLoading === "image" ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              Gerar com IA
            </Button>
          </div>
          <Textarea
            rows={9}
            value={imageBrief}
            onChange={(e) => setImageBrief(e.target.value)}
            placeholder="Cena, elementos visuais, paleta, estilo, formato..."
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 justify-end">
        <Button variant="outline" onClick={handleSave} disabled={update.isPending}>
          Salvar rascunho
        </Button>
        <Button
          onClick={() => {
            // salva o rascunho atual antes de abrir a tela de aprovação
            update.mutate({
              id: item.id,
              updates: { text_briefing: textBrief, image_briefing: imageBrief },
            });
            setReviewing(true);
          }}
          disabled={!canApprove || update.isPending}
          className="gap-2"
        >
          <CheckCircle2 className="h-4 w-4" />
          Concluir e aprovar
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};

// ===== Etapa 3: Design =====
const StageDesign = ({
  item,
  onAdvance,
  loading,
}: {
  item: CalendarItem;
  onAdvance: () => void;
  loading: boolean;
}) => (
  <div className="space-y-4">
    <div>
      <h3 className="font-semibold text-sm mb-1">Criação da imagem</h3>
      <p className="text-sm text-muted-foreground">
        Use o briefing aprovado para gerar a imagem na ferramenta de criação.
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="rounded-lg bg-muted/40 p-4">
        <p className="text-xs font-medium text-muted-foreground mb-1">Briefing de texto</p>
        <p className="text-sm whitespace-pre-wrap">{item.text_briefing}</p>
      </div>
      <div className="rounded-lg bg-muted/40 p-4">
        <p className="text-xs font-medium text-muted-foreground mb-1">Briefing visual</p>
        <p className="text-sm whitespace-pre-wrap">{item.image_briefing}</p>
      </div>
    </div>

    <div className="flex flex-wrap gap-2 justify-end">
      <Button variant="outline" asChild>
        <Link to="/create/image" state={{ prefilledBrief: item.image_briefing }}>
          <ImageIcon className="h-4 w-4 mr-1.5" /> Abrir gerador de imagem
        </Link>
      </Button>
      <Button onClick={onAdvance} disabled={loading} className="gap-2">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        Marcar como pronto e enviar para revisão
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  </div>
);

// ===== Etapa 4: Revisão =====
const StageReview = ({
  item,
  onAdvance,
  loading,
}: {
  item: CalendarItem;
  onAdvance: () => void;
  loading: boolean;
}) => (
  <div className="space-y-4">
    <div>
      <h3 className="font-semibold text-sm mb-1">Revisão final</h3>
      <p className="text-sm text-muted-foreground">
        Confira a peça final e aprove para concluir o fluxo.
      </p>
    </div>
    <div className="rounded-lg bg-muted/40 p-4 text-sm text-muted-foreground">
      Quando o conteúdo estiver vinculado a uma ação, você poderá visualizá-lo aqui.
    </div>
    <div className="flex justify-end">
      <Button onClick={onAdvance} disabled={loading} className="gap-2">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
        Concluir pauta
      </Button>
    </div>
  </div>
);
