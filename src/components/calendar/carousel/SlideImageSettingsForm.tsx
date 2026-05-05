import { useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { VisualStyleGrid } from "@/components/quick-content/VisualStyleGrid";
import { CameraAngleGrid } from "@/components/quick-content/CameraAngleGrid";

export interface SlideImageSettings {
  visualStyle?: string;
  cameraAngle?: string;
  lighting?: string;
  composition?: string;
  mood?: string;
  referenceImageUrl?: string | null;
  // Mantidos para compatibilidade com slides antigos. Não são mais editados aqui;
  // a inserção de texto acontece em etapa separada (após aprovação das imagens).
  imageIncludeText?: boolean;
  imageTextContent?: string;
  imageTextPosition?: string;
}

const LIGHTING_OPTIONS = [
  { value: "natural", label: "Natural" },
  { value: "studio", label: "Estúdio" },
  { value: "golden_hour", label: "Golden hour" },
  { value: "dramatic", label: "Dramática" },
  { value: "soft", label: "Suave" },
  { value: "neon", label: "Neon" },
];

const COMPOSITION_OPTIONS = [
  { value: "auto", label: "Automática" },
  { value: "rule_of_thirds", label: "Regra dos terços" },
  { value: "centered", label: "Centralizada" },
  { value: "symmetrical", label: "Simétrica" },
  { value: "minimal", label: "Minimalista" },
  { value: "dynamic", label: "Dinâmica" },
];

const MOOD_OPTIONS = [
  { value: "auto", label: "Automático" },
  { value: "energetic", label: "Energético" },
  { value: "calm", label: "Calmo" },
  { value: "professional", label: "Profissional" },
  { value: "playful", label: "Divertido" },
  { value: "luxury", label: "Sofisticado" },
  { value: "warm", label: "Acolhedor" },
];

interface Props {
  value: SlideImageSettings;
  onChange: (next: SlideImageSettings) => void;
  defaultHeadline?: string;
  sharedMood?: string;
  sharedVisualStyle?: string;
}

export function SlideImageSettingsForm({
  value,
  onChange,
  sharedMood,
  sharedVisualStyle,
}: Props) {
  const patch = (p: Partial<SlideImageSettings>) => onChange({ ...value, ...p });
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Arquivo deve ser uma imagem");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Máximo 10MB");
      return;
    }
    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Não autenticado");
      const ext = file.name.split(".").pop() || "png";
      const path = `carousel-refs/${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("content-images").upload(path, file, {
        contentType: file.type,
        upsert: false,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("content-images").getPublicUrl(path);
      patch({ referenceImageUrl: data.publicUrl });
      toast.success("Imagem de referência adicionada");
    } catch (e: any) {
      toast.error(e?.message || "Falha no upload");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label className="text-[11px] uppercase font-semibold text-muted-foreground">
            Estilo visual
          </Label>
          <VisualStyleGrid
            value={value.visualStyle || sharedVisualStyle || "realistic"}
            onChange={(v) => patch({ visualStyle: v })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] uppercase font-semibold text-muted-foreground">
            Ângulo de câmera
          </Label>
          <CameraAngleGrid
            value={value.cameraAngle || "eye_level"}
            onChange={(v) => patch({ cameraAngle: v })}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label className="text-[11px] uppercase font-semibold text-muted-foreground">
            Iluminação
          </Label>
          <Select value={value.lighting || "natural"} onValueChange={(v) => patch({ lighting: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LIGHTING_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] uppercase font-semibold text-muted-foreground">
            Composição
          </Label>
          <Select value={value.composition || "auto"} onValueChange={(v) => patch({ composition: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {COMPOSITION_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-[11px] uppercase font-semibold text-muted-foreground">
            Mood
          </Label>
          <Select
            value={value.mood || sharedMood || "auto"}
            onValueChange={(v) => patch({ mood: v })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {MOOD_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2 pt-3 border-t border-border/60">
        <Label className="text-[11px] uppercase font-semibold text-muted-foreground">
          Imagem de referência (opcional)
        </Label>
        <p className="text-[11px] text-muted-foreground">
          Envie uma imagem para guiar o estilo, paleta ou enquadramento desta cena.
        </p>
        {value.referenceImageUrl ? (
          <div className="relative inline-block">
            <img
              src={value.referenceImageUrl}
              alt="Referência"
              className="h-32 w-32 object-cover rounded-lg border border-border"
            />
            <button
              type="button"
              onClick={() => patch({ referenceImageUrl: null })}
              className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
              title="Remover"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <>
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
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="gap-2"
            >
              {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImagePlus className="h-3.5 w-3.5" />}
              {uploading ? "Enviando…" : "Enviar imagem"}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
