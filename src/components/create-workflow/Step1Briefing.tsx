import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Building2,
  UserRound,
  Newspaper,
  ChevronDown,
  X,
  Info,
  Lightbulb,
  Zap,
} from "lucide-react";
import { BriefingFormData } from "./types";
import { cn } from "@/lib/utils";

const PLATFORM_OPTIONS = [
  { value: "instagram", label: "Instagram" },
  { value: "facebook", label: "Facebook" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "twitter", label: "Twitter (X)" },
  { value: "tiktok", label: "TikTok" },
];

const OBJECTIVE_OPTIONS = [
  { value: "Autoridade", label: "Construir autoridade" },
  { value: "Engajamento", label: "Gerar engajamento" },
  { value: "Conversão", label: "Converter / vender" },
  { value: "Educação", label: "Educar o público" },
  { value: "Marca", label: "Fortalecer a marca" },
  { value: "Lançamento", label: "Lançar produto/serviço" },
];

const TONE_OPTIONS = [
  "inspirador",
  "motivacional",
  "profissional",
  "casual",
  "elegante",
  "moderno",
  "tradicional",
  "divertido",
  "sério",
];

const BRIEFING_EXAMPLES = [
  "Quero mostrar como nosso novo método de gestão financeira ajuda PMEs a economizar até 30% em 90 dias, com depoimento real de cliente.",
  "Post de bastidores celebrando 1 ano de empresa: time reunido, conquista do primeiro cliente grande, gratidão à comunidade.",
  "Anúncio para Black Friday: produto X com 40% off, gancho forte de escassez (só 50 unidades), CTA direto para o site.",
];

interface Step1BriefingProps {
  value: BriefingFormData;
  onChange: (next: BriefingFormData) => void;
  errors: Partial<Record<keyof BriefingFormData, string>>;
}

// ───────────────────────────────────────────────────────────────────────────
// Inline customization card (same design as /create/image)
// ───────────────────────────────────────────────────────────────────────────
function CustomizationCardInline({
  icon,
  title,
  description,
  options,
  value,
  onChange,
  disabled,
  error,
  required,
  emptyAction,
  emptyLabel,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  error?: boolean;
  required?: boolean;
  emptyAction?: () => void;
  emptyLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? options.find((o) => o.value === value) : null;

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex-1 min-w-[140px] flex flex-col rounded-xl p-3 text-left transition-all",
            disabled
              ? "bg-muted/40 opacity-60 cursor-not-allowed"
              : "bg-card shadow-sm cursor-pointer active:scale-[0.98]",
            selected && "ring-1 ring-primary/30",
            error && "ring-2 ring-destructive/30",
          )}
        >
          <div className="flex items-center gap-2 w-full">
            <div className="flex-shrink-0 text-muted-foreground">{icon}</div>
            <span className="text-xs font-semibold text-foreground flex-1 min-w-0">
              {title}
              {required && <span className="text-destructive ml-0.5">*</span>}
            </span>
            <ChevronDown
              className={cn(
                "h-3.5 w-3.5 text-muted-foreground flex-shrink-0 transition-transform",
                open && "rotate-180",
              )}
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">{description}</p>
          <div className="mt-2 min-h-[22px]">
            {selected ? (
              <Badge
                variant="secondary"
                className="gap-1 px-2 py-0.5 text-[10px] font-medium bg-primary/10 text-primary border border-primary/20 max-w-full hover:bg-primary/10 cursor-default"
              >
                <span className="truncate">{selected.label}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange("");
                  }}
                  className="flex-shrink-0 rounded-full p-0.5 hover:bg-destructive/20 hover:text-destructive transition-colors"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            ) : (
              <span className="text-[10px] text-muted-foreground/50">
                {emptyAction ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      emptyAction();
                    }}
                    className="text-primary hover:underline"
                  >
                    {emptyLabel}
                  </button>
                ) : (
                  "Nenhum selecionado"
                )}
              </span>
            )}
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        sideOffset={6}
        className="w-56 p-1.5 rounded-xl max-h-60 overflow-y-auto"
      >
        {options.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">
            Nenhuma opção disponível
          </p>
        ) : (
          options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={cn(
                "w-full text-left px-3 py-2 rounded-lg text-sm transition-all",
                value === opt.value
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-foreground hover:bg-muted/60",
              )}
            >
              {opt.label}
            </button>
          ))
        )}
      </PopoverContent>
    </Popover>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Step1Briefing
// ───────────────────────────────────────────────────────────────────────────
export function Step1Briefing({ value, onChange, errors }: Step1BriefingProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showExample, setShowExample] = useState(0);

  const { data: brands = [], isLoading: loadingBrands } = useQuery({
    queryKey: ["wf-brands", user?.teamId],
    queryFn: async () => {
      if (!user?.teamId) return [];
      const { data } = await supabase
        .from("brands")
        .select("id, name")
        .eq("team_id", user.teamId)
        .order("name");
      return data || [];
    },
    enabled: !!user?.teamId,
  });

  const { data: themes = [], isLoading: loadingThemes } = useQuery({
    queryKey: ["wf-themes", user?.teamId],
    queryFn: async () => {
      if (!user?.teamId) return [];
      const { data } = await supabase
        .from("strategic_themes")
        .select("id, title, brand_id")
        .eq("team_id", user.teamId);
      return data || [];
    },
    enabled: !!user?.teamId,
  });

  const { data: personas = [], isLoading: loadingPersonas } = useQuery({
    queryKey: ["wf-personas", user?.teamId],
    queryFn: async () => {
      if (!user?.teamId) return [];
      const { data } = await supabase
        .from("personas")
        .select("id, name, brand_id")
        .eq("team_id", user.teamId);
      return data || [];
    },
    enabled: !!user?.teamId,
  });

  const isLoadingData = loadingBrands || loadingThemes || loadingPersonas;

  const filteredThemes = useMemo(
    () => themes.filter((t) => t.brand_id === value.brand),
    [themes, value.brand],
  );
  const filteredPersonas = useMemo(
    () => personas.filter((p) => p.brand_id === value.brand),
    [personas, value.brand],
  );

  // Reset theme/persona if brand changes
  useEffect(() => {
    if (
      value.brand &&
      value.theme &&
      !filteredThemes.find((t) => t.id === value.theme)
    ) {
      onChange({ ...value, theme: "", persona: "" });
    }
  }, [value.brand]); // eslint-disable-line

  const set = <K extends keyof BriefingFormData>(
    k: K,
    v: BriefingFormData[K],
  ) => {
    onChange({ ...value, [k]: v });
  };

  const toggleTone = (t: string) => {
    if (value.tone.includes(t)) {
      set(
        "tone",
        value.tone.filter((x) => x !== t),
      );
    } else if (value.tone.length < 4) {
      set("tone", [...value.tone, t]);
    }
  };

  const ideaLength = value.idea.trim().length;

  return (
    <div className="space-y-5">
      {/* ─── 1. Idea / Briefing (floating card, same as Descreva sua imagem) ─── */}
      <div className="space-y-2.5">
        <div>
          <Label htmlFor="briefing-idea" className="text-base font-bold text-foreground">
            Conte sua ideia <span className="text-destructive">*</span>
          </Label>
          <p className="text-xs text-muted-foreground mt-0.5">
            A IA vai usar este briefing para sugerir um template completo
            (visual + legenda). Quanto mais clara a ideia, melhor o resultado.
          </p>
        </div>

        <div
          className={cn(
            "rounded-2xl shadow-lg overflow-hidden border-0 bg-card transition-shadow focus-within:shadow-xl",
            errors.idea && "ring-2 ring-destructive/30",
          )}
        >
          <div className="p-4 md:p-5 pb-2">
            <Textarea
              id="briefing-idea"
              value={value.idea}
              onChange={(e) => set("idea", e.target.value)}
              placeholder="Ex: Quero mostrar como nosso método ajuda PMEs a economizar 30% em 90 dias, com depoimento real de cliente, tom inspirador e gancho forte."
              rows={4}
              maxLength={4000}
              className="resize-none border-0 bg-transparent p-0 text-base placeholder:text-sm placeholder:text-muted-foreground/50 focus-visible:ring-0 focus-visible:ring-offset-0 min-h-[100px]"
            />
          </div>

          {/* Bottom toolbar */}
          <div className="flex items-center gap-2 px-4 md:px-5 py-2.5 border-t border-border/20 bg-muted/10">
            <button
              type="button"
              onClick={() =>
                setShowExample((showExample + 1) % BRIEFING_EXAMPLES.length)
              }
              className="h-7 inline-flex items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-all"
            >
              <Lightbulb className="h-3.5 w-3.5" />
              <span>Ver exemplo</span>
            </button>
            <div className="flex-1" />
            <span
              className={cn(
                "text-[10px] font-medium",
                ideaLength < 30 ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {ideaLength}/30 mínimo
            </span>
          </div>
        </div>

        {errors.idea && (
          <p className="text-xs text-destructive font-medium">{errors.idea}</p>
        )}

        <div className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
          <Lightbulb className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-foreground mb-0.5">
              Exemplo de bom briefing:
            </p>
            <p className="text-xs text-muted-foreground italic">
              "{BRIEFING_EXAMPLES[showExample]}"
            </p>
          </div>
        </div>
      </div>

      {/* ─── 2. Personalizações (inline cards, same design as /create/image) ─── */}
      <div className="space-y-2.5">
        <p className="text-base font-bold text-foreground">Personalizações</p>
        <div className="flex flex-wrap gap-2">
          {/* Tipo de Conteúdo */}
          <div
            className={cn(
              "flex-1 min-w-[140px] flex flex-col rounded-xl p-3 text-left bg-card shadow-sm",
              value.contentType === "ads" && "ring-1 ring-primary/30",
            )}
          >
            <div className="flex items-center gap-2 w-full">
              <Zap className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-xs font-semibold text-foreground flex-1 min-w-0">
                Conteúdo
              </span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Tipo de conteúdo
            </p>
            <div className="mt-2 flex gap-1">
              <button
                type="button"
                onClick={() => set("contentType", "organic")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all",
                  value.contentType === "organic"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/50 text-muted-foreground hover:text-foreground",
                )}
              >
                Orgânico
              </button>
              <button
                type="button"
                onClick={() => set("contentType", "ads")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[10px] font-semibold transition-all",
                  value.contentType === "ads"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/50 text-muted-foreground hover:text-foreground",
                )}
              >
                Tráfego
              </button>
            </div>
          </div>

          {/* Marca */}
          {isLoadingData ? (
            <Skeleton className="h-24 flex-1 min-w-[140px] rounded-xl" />
          ) : (
            <CustomizationCardInline
              icon={<Building2 className="h-4 w-4" />}
              title="Marca"
              required
              description="Vincular a uma marca"
              options={brands.map((b) => ({ value: b.id, label: b.name }))}
              value={value.brand}
              onChange={(v) => set("brand", v)}
              error={!!errors.brand}
              emptyAction={
                brands.length === 0 ? () => navigate("/brands") : undefined
              }
              emptyLabel="Cadastre uma marca"
            />
          )}

          {/* Persona */}
          {isLoadingData ? (
            <Skeleton className="h-24 flex-1 min-w-[140px] rounded-xl" />
          ) : (
            <CustomizationCardInline
              icon={<UserRound className="h-4 w-4" />}
              title="Persona"
              description="Público-alvo"
              options={filteredPersonas.map((p) => ({
                value: p.id,
                label: p.name,
              }))}
              value={value.persona}
              onChange={(v) => set("persona", v)}
              disabled={!value.brand}
            />
          )}

          {/* Editoria */}
          {isLoadingData ? (
            <Skeleton className="h-24 flex-1 min-w-[140px] rounded-xl" />
          ) : (
            <CustomizationCardInline
              icon={<Newspaper className="h-4 w-4" />}
              title="Editoria"
              description="Linha editorial"
              options={filteredThemes.map((t) => ({
                value: t.id,
                label: t.title,
              }))}
              value={value.theme}
              onChange={(v) => set("theme", v)}
              disabled={!value.brand}
            />
          )}
        </div>
        {errors.brand && (
          <p className="text-[10px] text-destructive font-medium">
            {errors.brand}
          </p>
        )}
      </div>

      {/* ─── 3. Plataforma + Objetivo ─── */}
      <div className="space-y-2.5">
        <p className="text-base font-bold text-foreground">Direcionamento</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Plataforma <span className="text-destructive">*</span>
            </Label>
            <NativeSelect
              value={value.platform}
              onValueChange={(v) => set("platform", v)}
              options={PLATFORM_OPTIONS}
              placeholder="Onde será publicado?"
              triggerClassName={cn(
                "h-10 rounded-xl bg-card shadow-sm border-0",
                errors.platform && "ring-2 ring-destructive/30",
              )}
            />
            {errors.platform && (
              <p className="text-[10px] text-destructive font-medium">
                {errors.platform}
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-foreground">
              Objetivo <span className="text-destructive">*</span>
            </Label>
            <NativeSelect
              value={value.objective}
              onValueChange={(v) => set("objective", v)}
              options={OBJECTIVE_OPTIONS}
              placeholder="O que esse conteúdo precisa entregar?"
              triggerClassName={cn(
                "h-10 rounded-xl bg-card shadow-sm border-0",
                errors.objective && "ring-2 ring-destructive/30",
              )}
            />
            {errors.objective && (
              <p className="text-[10px] text-destructive font-medium">
                {errors.objective}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ─── 4. Tom de Voz ─── */}
      <div className="space-y-2">
        <Label className="text-base font-bold text-foreground">
          Tom de voz{" "}
          <span className="text-xs font-normal text-muted-foreground">
            (máx. 4)
          </span>
        </Label>
        <div className="flex flex-wrap gap-1.5">
          {TONE_OPTIONS.map((t) => {
            const selected = value.tone.includes(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleTone(t)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-[0.97] capitalize",
                  selected
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted/50 text-foreground shadow-sm hover:shadow-md hover:text-primary",
                )}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── 5. Notas adicionais (collapsible-style card) ─── */}
      <div className="space-y-1.5">
        <Label
          htmlFor="briefing-notes"
          className="text-xs font-semibold text-foreground"
        >
          Notas adicionais
        </Label>
        <div className="rounded-2xl bg-card shadow-sm overflow-hidden">
          <Textarea
            id="briefing-notes"
            value={value.additionalNotes}
            onChange={(e) => set("additionalNotes", e.target.value)}
            placeholder="Restrições, referências, palavras a evitar, datas relevantes..."
            rows={2}
            maxLength={2000}
            className="resize-none border-0 bg-transparent text-sm placeholder:text-muted-foreground/50 focus-visible:ring-0 focus-visible:ring-offset-0 p-3"
          />
        </div>
      </div>

      {/* ─── Info credits ─── */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 rounded-xl p-3">
        <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <span>
          Gerar o template é <strong>gratuito</strong>. Os créditos só serão
          cobrados quando você confirmar e gerar a imagem + legenda final.
        </span>
      </div>
    </div>
  );
}
