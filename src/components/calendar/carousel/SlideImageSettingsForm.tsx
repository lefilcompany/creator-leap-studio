import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageIcon, Type } from "lucide-react";
import { VisualStyleGrid } from "@/components/quick-content/VisualStyleGrid";
import { CameraAngleGrid } from "@/components/quick-content/CameraAngleGrid";

export interface SlideImageSettings {
  visualStyle?: string;
  cameraAngle?: string;
  lighting?: string;
  composition?: string;
  mood?: string;
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

const TEXT_POSITIONS = [
  { value: "top", label: "Topo" },
  { value: "center", label: "Centro" },
  { value: "bottom", label: "Rodapé" },
  { value: "top-left", label: "Topo esquerdo" },
  { value: "top-right", label: "Topo direito" },
  { value: "bottom-left", label: "Rodapé esquerdo" },
  { value: "bottom-right", label: "Rodapé direito" },
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
  defaultHeadline,
  sharedMood,
  sharedVisualStyle,
}: Props) {
  const patch = (p: Partial<SlideImageSettings>) => onChange({ ...value, ...p });

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

      <div className="space-y-3 pt-3 border-t border-border/60">
        <div className="flex items-center justify-between gap-3">
          <Label className="text-[11px] uppercase font-semibold text-muted-foreground flex items-center gap-1.5">
            <Type className="h-3 w-3" />
            Incluir texto na imagem
          </Label>
          <Switch
            checked={!!value.imageIncludeText}
            onCheckedChange={(v) =>
              patch({
                imageIncludeText: v,
                imageTextContent: value.imageTextContent || defaultHeadline,
              })
            }
          />
        </div>
        {value.imageIncludeText && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2 space-y-1.5">
              <Label className="text-[11px] uppercase font-semibold text-muted-foreground">
                Texto
              </Label>
              <Input
                value={value.imageTextContent || ""}
                maxLength={50}
                placeholder="Máx. 50 caracteres"
                onChange={(e) => patch({ imageTextContent: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase font-semibold text-muted-foreground">
                Posição
              </Label>
              <Select
                value={value.imageTextPosition || "center"}
                onValueChange={(v) => patch({ imageTextPosition: v })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEXT_POSITIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
