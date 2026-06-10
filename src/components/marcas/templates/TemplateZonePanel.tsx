import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2 } from "lucide-react";
import type { TemplateTextZone } from "@/types/template";
import { FontPicker } from "./FontPicker";

interface TemplateZonePanelProps {
  zone: TemplateTextZone;
  customFonts: { id: string; name: string }[];
  onChange: (zone: TemplateTextZone) => void;
  onRemove: () => void;
}

export function TemplateZonePanel({ zone, customFonts, onChange, onRemove }: TemplateZonePanelProps) {
  const set = <K extends keyof TemplateTextZone>(k: K, v: TemplateTextZone[K]) =>
    onChange({ ...zone, [k]: v });

  return (
    <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/10 p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold uppercase tracking-wider text-foreground">Zona selecionada</h4>
        <Button variant="ghost" size="icon" onClick={onRemove} className="h-8 w-8 text-destructive hover:bg-destructive/10">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs uppercase text-muted-foreground">Nome da zona</Label>
        <Input value={zone.label} onChange={(e) => set("label", e.target.value)} className="rounded-xl" />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs uppercase text-muted-foreground">Texto original (referência)</Label>
        <Textarea
          value={zone.original_text ?? ""}
          onChange={(e) => set("original_text", e.target.value)}
          className="rounded-xl min-h-[60px]"
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs uppercase text-muted-foreground">Fonte</Label>
        <FontPicker value={zone.font_family} onChange={(f) => set("font_family", f)} customFonts={customFonts} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs uppercase text-muted-foreground">Peso</Label>
          <Select value={String(zone.font_weight)} onValueChange={(v) => set("font_weight", Number(v))}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              {[300, 400, 500, 600, 700, 800, 900].map((w) => (
                <SelectItem key={w} value={String(w)}>{w}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs uppercase text-muted-foreground">Tamanho (px)</Label>
          <Input
            type="number"
            min={8}
            max={400}
            value={zone.font_size_px}
            onChange={(e) => set("font_size_px", Number(e.target.value))}
            className="rounded-xl"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs uppercase text-muted-foreground">Cor</Label>
          <Input
            type="color"
            value={zone.color}
            onChange={(e) => set("color", e.target.value)}
            className="rounded-xl h-10 p-1"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs uppercase text-muted-foreground">Alinhamento</Label>
          <Select value={zone.align} onValueChange={(v) => set("align", v as "left" | "center" | "right")}>
            <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Esquerda</SelectItem>
              <SelectItem value="center">Centro</SelectItem>
              <SelectItem value="right">Direita</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs uppercase text-muted-foreground">Máx. caracteres</Label>
        <Input
          type="number"
          min={1}
          value={zone.max_chars ?? ""}
          placeholder="Sem limite"
          onChange={(e) => set("max_chars", e.target.value ? Number(e.target.value) : undefined)}
          className="rounded-xl"
        />
      </div>
    </div>
  );
}
