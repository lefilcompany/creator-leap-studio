import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/components/ui/native-select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { X, Info, Sparkles, Lightbulb } from "lucide-react";
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
  "inspirador", "motivacional", "profissional", "casual",
  "elegante", "moderno", "tradicional", "divertido", "sério",
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

export function Step1Briefing({ value, onChange, errors }: Step1BriefingProps) {
  const { user } = useAuth();
  const [showExample, setShowExample] = useState(0);

  const { data: brands = [] } = useQuery({
    queryKey: ["wf-brands", user?.teamId],
    queryFn: async () => {
      if (!user?.teamId) return [];
      const { data } = await supabase
        .from("brands").select("id, name").eq("team_id", user.teamId)
        .order("name");
      return data || [];
    },
    enabled: !!user?.teamId,
  });

  const { data: themes = [] } = useQuery({
    queryKey: ["wf-themes", user?.teamId],
    queryFn: async () => {
      if (!user?.teamId) return [];
      const { data } = await supabase
        .from("strategic_themes").select("id, title, brand_id").eq("team_id", user.teamId);
      return data || [];
    },
    enabled: !!user?.teamId,
  });

  const { data: personas = [] } = useQuery({
    queryKey: ["wf-personas", user?.teamId],
    queryFn: async () => {
      if (!user?.teamId) return [];
      const { data } = await supabase
        .from("personas").select("id, name, brand_id").eq("team_id", user.teamId);
      return data || [];
    },
    enabled: !!user?.teamId,
  });

  const filteredThemes = useMemo(
    () => themes.filter(t => t.brand_id === value.brand),
    [themes, value.brand],
  );
  const filteredPersonas = useMemo(
    () => personas.filter(p => p.brand_id === value.brand),
    [personas, value.brand],
  );

  // Reset theme/persona if brand changes
  useEffect(() => {
    if (value.brand && value.theme && !filteredThemes.find(t => t.id === value.theme)) {
      onChange({ ...value, theme: "", persona: "" });
    }
  }, [value.brand]); // eslint-disable-line

  const set = <K extends keyof BriefingFormData>(k: K, v: BriefingFormData[K]) => {
    onChange({ ...value, [k]: v });
  };

  const toggleTone = (t: string) => {
    if (value.tone.includes(t)) {
      set("tone", value.tone.filter(x => x !== t));
    } else if (value.tone.length < 4) {
      set("tone", [...value.tone, t]);
    }
  };

  const ideaLength = value.idea.trim().length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg sm:text-xl font-bold text-foreground">Conte sua ideia</h2>
        <p className="text-sm text-muted-foreground mt-1">
          A IA vai usar este briefing para sugerir um template completo de conteúdo
          (visual + legenda). Quanto mais clara a ideia, melhor o resultado.
        </p>
      </div>

      {/* Marca + Plataforma */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-bold">
            Marca <span className="text-destructive">*</span>
          </Label>
          <NativeSelect
            value={value.brand}
            onValueChange={v => set("brand", v)}
            options={brands.map(b => ({ value: b.id, label: b.name }))}
            placeholder={brands.length ? "Selecione uma marca" : "Nenhuma marca cadastrada"}
            disabled={!brands.length}
            triggerClassName={cn(
              "h-10 rounded-xl border-2",
              errors.brand && "border-destructive",
            )}
          />
          {errors.brand && <p className="text-xs text-destructive">{errors.brand}</p>}
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-bold">
            Plataforma <span className="text-destructive">*</span>
          </Label>
          <NativeSelect
            value={value.platform}
            onValueChange={v => set("platform", v)}
            options={PLATFORM_OPTIONS}
            placeholder="Onde será publicado?"
            triggerClassName={cn(
              "h-10 rounded-xl border-2",
              errors.platform && "border-destructive",
            )}
          />
          {errors.platform && <p className="text-xs text-destructive">{errors.platform}</p>}
        </div>
      </div>

      {/* Editoria + Persona (opcionais) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-bold">Editoria</Label>
          <NativeSelect
            value={value.theme}
            onValueChange={v => set("theme", v)}
            options={filteredThemes.map(t => ({ value: t.id, label: t.title }))}
            placeholder={
              !value.brand ? "Selecione uma marca primeiro"
                : filteredThemes.length ? "Opcional"
                  : "Nenhuma editoria desta marca"
            }
            disabled={!value.brand || !filteredThemes.length}
            triggerClassName="h-10 rounded-xl border-2"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-bold">Persona</Label>
          <NativeSelect
            value={value.persona}
            onValueChange={v => set("persona", v)}
            options={filteredPersonas.map(p => ({ value: p.id, label: p.name }))}
            placeholder={
              !value.brand ? "Selecione uma marca primeiro"
                : filteredPersonas.length ? "Opcional"
                  : "Nenhuma persona desta marca"
            }
            disabled={!value.brand || !filteredPersonas.length}
            triggerClassName="h-10 rounded-xl border-2"
          />
        </div>
      </div>

      {/* Objetivo + Tipo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-sm font-bold">
            Objetivo <span className="text-destructive">*</span>
          </Label>
          <NativeSelect
            value={value.objective}
            onValueChange={v => set("objective", v)}
            options={OBJECTIVE_OPTIONS}
            placeholder="O que esse conteúdo precisa entregar?"
            triggerClassName={cn(
              "h-10 rounded-xl border-2",
              errors.objective && "border-destructive",
            )}
          />
          {errors.objective && <p className="text-xs text-destructive">{errors.objective}</p>}
        </div>
        <div className="space-y-1.5">
          <Label className="text-sm font-bold">Tipo de conteúdo</Label>
          <RadioGroup
            value={value.contentType}
            onValueChange={v => set("contentType", v as "organic" | "ads")}
            className="flex gap-2"
          >
            {[
              { v: "organic", label: "Orgânico" },
              { v: "ads", label: "Anúncio (Ads)" },
            ].map(opt => (
              <label
                key={opt.v}
                htmlFor={`ct-${opt.v}`}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-3 py-2 h-10 rounded-xl border-2 cursor-pointer text-sm font-medium transition-colors",
                  value.contentType === opt.v
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background hover:bg-muted/50",
                )}
              >
                <RadioGroupItem id={`ct-${opt.v}`} value={opt.v} className="sr-only" />
                {opt.label}
              </label>
            ))}
          </RadioGroup>
        </div>
      </div>

      {/* Ideia / briefing */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-bold">
            Ideia / Briefing <span className="text-destructive">*</span>
          </Label>
          <span className={cn(
            "text-xs",
            ideaLength < 30 ? "text-destructive" : "text-muted-foreground",
          )}>
            {ideaLength}/30 mínimo
          </span>
        </div>
        <Textarea
          value={value.idea}
          onChange={e => set("idea", e.target.value)}
          placeholder="Descreva sua ideia: o que quer comunicar, para quem, qual o gancho, tem alguma referência visual ou tom específico..."
          rows={5}
          className={cn(
            "resize-none rounded-xl border-2",
            errors.idea && "border-destructive",
          )}
          maxLength={4000}
        />
        {errors.idea && <p className="text-xs text-destructive">{errors.idea}</p>}

        <Card className="bg-primary/5 border-primary/20 mt-2">
          <CardContent className="p-3 flex gap-2.5">
            <Lightbulb className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground mb-1">
                Exemplo de bom briefing:
              </p>
              <p className="text-xs text-muted-foreground italic line-clamp-3">
                "{BRIEFING_EXAMPLES[showExample]}"
              </p>
              <button
                type="button"
                onClick={() => setShowExample((showExample + 1) % BRIEFING_EXAMPLES.length)}
                className="text-xs text-primary hover:underline mt-1 font-medium"
              >
                Ver outro exemplo →
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tom de voz */}
      <div className="space-y-1.5">
        <Label className="text-sm font-bold">
          Tom de voz <span className="text-xs text-muted-foreground font-normal">(até 4)</span>
        </Label>
        <div className="flex flex-wrap gap-2">
          {TONE_OPTIONS.map(t => {
            const selected = value.tone.includes(t);
            return (
              <button
                key={t}
                type="button"
                onClick={() => toggleTone(t)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-xs font-medium border-2 transition-colors capitalize",
                  selected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-background hover:bg-muted/50 text-muted-foreground",
                )}
              >
                {t}
                {selected && <X className="inline h-3 w-3 ml-1" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Notas adicionais */}
      <div className="space-y-1.5">
        <Label className="text-sm font-bold">Notas adicionais</Label>
        <Textarea
          value={value.additionalNotes}
          onChange={e => set("additionalNotes", e.target.value)}
          placeholder="Restrições, referências, palavras a evitar, datas relevantes..."
          rows={2}
          className="resize-none rounded-xl border-2"
          maxLength={2000}
        />
      </div>

      <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
        <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
        <span>
          Gerar o template é <strong>gratuito</strong>. Os créditos só serão cobrados
          quando você confirmar e gerar a imagem + legenda final.
        </span>
      </div>
    </div>
  );
}
