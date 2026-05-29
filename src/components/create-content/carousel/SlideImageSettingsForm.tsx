import { useRef } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImagePlus, X, ChevronDown, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import type { SlideBriefing } from "./types";

const VISUAL_STYLES = [
  { value: "realistic", label: "Fotorealístico" },
  { value: "animated", label: "Animado / 3D" },
  { value: "cartoon", label: "Cartoon" },
  { value: "minimalist", label: "Minimalista" },
  { value: "vintage", label: "Vintage" },
  { value: "watercolor", label: "Aquarela" },
];

const CAMERA_ANGLES = [
  { value: "eye_level", label: "Olho no olho" },
  { value: "top_down", label: "Top-down" },
  { value: "low_angle", label: "Baixo ângulo" },
  { value: "close_up", label: "Close-up" },
];

const LIGHTING = [
  { value: "natural", label: "Natural" },
  { value: "studio", label: "Estúdio" },
  { value: "golden_hour", label: "Hora dourada" },
  { value: "dramatic", label: "Dramática" },
];

const COMPOSITION = [
  { value: "auto", label: "Automática" },
  { value: "rule_of_thirds", label: "Regra dos terços" },
  { value: "centered", label: "Centralizada" },
  { value: "symmetry", label: "Simetria" },
];

const MOOD = [
  { value: "auto", label: "Automático" },
  { value: "energetic", label: "Energético" },
  { value: "calm", label: "Calmo" },
  { value: "luxurious", label: "Luxuoso" },
  { value: "playful", label: "Divertido" },
];

interface Props {
  slide: SlideBriefing;
  onChange: (next: SlideBriefing) => void;
  expanded: boolean;
  onToggleExpanded: () => void;
}

function Field({ label, value, options, onChange }: {
  label: string;
  value?: string;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-border/50 bg-card px-2.5 py-1.5 text-sm focus:ring-1 focus:ring-primary/40 outline-none"
      >
        <option value="">—</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

export function SlideImageSettingsForm({ slide, onChange, expanded, onToggleExpanded }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { user } = useAuth();

  const handleUpload = async (file: File) => {
    if (!user?.id) {
      toast.error("Faça login para enviar imagens");
      return;
    }
    const ext = (file.name.split(".").pop() || "png").toLowerCase();
    const path = `carousel-refs/${user.id}/${Date.now()}-slide-${slide.index}.${ext}`;
    const { error } = await supabase.storage.from("content-images").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) {
      toast.error("Erro ao enviar imagem", { description: error.message });
      return;
    }
    const { data } = supabase.storage.from("content-images").getPublicUrl(path);
    onChange({ ...slide, referenceImageUrl: data.publicUrl });
    toast.success("Referência adicionada");
  };

  return (
    <div className="rounded-xl border border-border/50 bg-card/50 p-3 space-y-2">
      <button
        type="button"
        onClick={onToggleExpanded}
        className="w-full flex items-center justify-between text-xs font-semibold text-foreground"
      >
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          Estilo visual do slide
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded && (
        <div className="space-y-3 pt-1">
          <div className="grid grid-cols-2 gap-2">
            <Field label="Estilo" value={slide.visualStyle} options={VISUAL_STYLES} onChange={(v) => onChange({ ...slide, visualStyle: v || undefined })} />
            <Field label="Ângulo" value={slide.cameraAngle} options={CAMERA_ANGLES} onChange={(v) => onChange({ ...slide, cameraAngle: v || undefined })} />
            <Field label="Iluminação" value={slide.lighting} options={LIGHTING} onChange={(v) => onChange({ ...slide, lighting: v || undefined })} />
            <Field label="Composição" value={slide.composition} options={COMPOSITION} onChange={(v) => onChange({ ...slide, composition: v || undefined })} />
            <Field label="Mood" value={slide.mood} options={MOOD} onChange={(v) => onChange({ ...slide, mood: v || undefined })} />
          </div>

          <div>
            <Label className="text-[11px] font-medium text-muted-foreground">Imagem de referência</Label>
            <div className="mt-1 flex items-center gap-2">
              {slide.referenceImageUrl ? (
                <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-2 py-1 text-xs">
                  <img src={slide.referenceImageUrl} alt="" className="h-8 w-8 rounded object-cover" />
                  <span className="truncate max-w-[140px]">Referência</span>
                  <button
                    type="button"
                    onClick={() => onChange({ ...slide, referenceImageUrl: undefined })}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border/60 px-2.5 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/40"
                >
                  <ImagePlus className="h-3.5 w-3.5" />
                  Adicionar referência
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                  e.target.value = "";
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function SlidePromptField({
  slide,
  onChange,
}: {
  slide: SlideBriefing;
  onChange: (next: SlideBriefing) => void;
}) {
  return (
    <div>
      <Label className="text-xs font-semibold">Briefing do slide {slide.index + 1}</Label>
      <Textarea
        value={slide.prompt}
        onChange={(e) => onChange({ ...slide, prompt: e.target.value })}
        placeholder={`Ex: ${slide.index === 0 ? "capa com headline e produto em destaque" : "detalhe do benefício " + (slide.index + 1)}`}
        rows={2}
        className="mt-1 resize-none text-sm"
      />
    </div>
  );
}
