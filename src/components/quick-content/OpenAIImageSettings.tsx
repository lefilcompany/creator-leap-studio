import { useRef, useState } from "react";
import { ChevronDown, Sparkles, Coins, Info, Pencil, X, Upload, Image as ImageIcon } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { CREDIT_COSTS, type OpenAIImageQuality } from "@/lib/creditCosts";

export interface OpenAIImageSettingsValue {
  quality: OpenAIImageQuality;
  size: string;             // ex: "1024x1024", "1536x1024", "auto"
  outputFormat: 'png' | 'jpeg' | 'webp';
  background: 'opaque' | 'auto';
  compression: number;      // 0-100 (apenas jpeg/webp)
  n: number;                // 1-10
  partialImages: number;    // 0-3 (preview progressivo)
  /** Quando true, usa o endpoint /v1/images/edits ao invés de /generations. */
  editMode: boolean;
  /** Data URLs das imagens base (máx. 4). Obrigatório quando editMode = true. */
  editBaseImages: string[];
  /** Data URL PNG opcional com transparência. Pixels transparentes serão regenerados. */
  editMask?: string | null;
}

export const DEFAULT_OPENAI_SETTINGS: OpenAIImageSettingsValue = {
  quality: 'medium',
  size: 'auto',
  outputFormat: 'png',
  background: 'auto',
  compression: 75,
  n: 1,
  partialImages: 2,
  editMode: false,
  editBaseImages: [],
  editMask: null,
};

const QUALITY_OPTIONS: { value: OpenAIImageQuality; label: string; cost: number; desc: string }[] = [
  { value: 'low', label: 'Baixa', cost: CREDIT_COSTS.COMPLETE_IMAGE_LOW, desc: 'Mais rápida e econômica. Ideal para testes e rascunhos.' },
  { value: 'medium', label: 'Média', cost: CREDIT_COSTS.COMPLETE_IMAGE_MEDIUM, desc: 'Equilíbrio entre qualidade e custo. Recomendada para o dia a dia.' },
  { value: 'high', label: 'Alta', cost: CREDIT_COSTS.COMPLETE_IMAGE_HIGH, desc: 'Máxima fidelidade. Ideal para anúncios e materiais finais.' },
];

const SIZE_OPTIONS = [
  { value: 'auto', label: 'Automático', desc: 'Baseado no formato escolhido' },
  { value: '1024x1024', label: '1024×1024', desc: 'Quadrado padrão' },
  { value: '1024x1536', label: '1024×1536', desc: 'Vertical (Stories/Reels)' },
  { value: '1536x1024', label: '1536×1024', desc: 'Horizontal (Feed/Banner)' },
  { value: '2048x2048', label: '2048×2048', desc: 'Quadrado HD (mais lento)' },
] as const;

const FORMAT_OPTIONS = [
  { value: 'png', label: 'PNG', desc: 'Sem perdas, suporta transparência' },
  { value: 'jpeg', label: 'JPEG', desc: 'Menor tamanho, com compressão' },
  { value: 'webp', label: 'WebP', desc: 'Equilibrado, moderno' },
] as const;

interface Props {
  value: OpenAIImageSettingsValue;
  onChange: (next: OpenAIImageSettingsValue) => void;
}

export function OpenAIImageSettings({ value, onChange }: Props) {
  const [expanded, setExpanded] = useState(false);
  const showCompression = value.outputFormat === 'jpeg' || value.outputFormat === 'webp';
  const selectedQuality = QUALITY_OPTIONS.find(q => q.value === value.quality)!;

  const update = <K extends keyof OpenAIImageSettingsValue>(key: K, v: OpenAIImageSettingsValue[K]) => {
    onChange({ ...value, [key]: v });
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="bg-card rounded-2xl border border-border/40 overflow-hidden">
        {/* Header */}
        <button
          type="button"
          onClick={() => setExpanded(e => !e)}
          className="w-full flex items-center justify-between gap-3 p-4 hover:bg-muted/30 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-foreground flex items-center gap-2">
                Motor de imagem
                <Badge variant="secondary" className="text-[10px] font-medium bg-primary/10 text-primary border-primary/20">
                  OpenAI GPT Image 2
                </Badge>
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Qualidade <span className="font-semibold text-foreground">{selectedQuality.label}</span>
                <span className="mx-1.5">·</span>
                <span className="inline-flex items-center gap-1 text-primary font-semibold">
                  <Coins className="h-3 w-3" />{selectedQuality.cost} créditos
                </span>
                {value.partialImages > 0 && (
                  <>
                    <span className="mx-1.5">·</span>
                    <span>Prévia progressiva</span>
                  </>
                )}
              </p>
            </div>
          </div>
          <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>

        {/* Body */}
        {expanded && (
          <div className="px-4 pb-5 pt-1 space-y-5 border-t border-border/40">
            {/* Qualidade */}
            <div className="space-y-2 pt-3">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                Qualidade
                <Tooltip>
                  <TooltipTrigger asChild><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">Define o custo em créditos e o tempo de geração. Quanto mais alta, mais detalhes e mais nítida.</TooltipContent>
                </Tooltip>
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {QUALITY_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update('quality', opt.value)}
                    className={`flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-all ${
                      value.quality === opt.value
                        ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                        : 'border-border/50 bg-background hover:bg-muted/40'
                    }`}
                  >
                    <span className="text-xs font-semibold text-foreground">{opt.label}</span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-primary">
                      <Coins className="h-2.5 w-2.5" />{opt.cost} créditos
                    </span>
                    <span className="text-[10px] text-muted-foreground line-clamp-2">{opt.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tamanho + Formato */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Tamanho da imagem</Label>
                <select
                  value={value.size}
                  onChange={(e) => update('size', e.target.value)}
                  className="w-full h-10 rounded-lg border border-border/50 bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {SIZE_OPTIONS.map(s => (
                    <option key={s.value} value={s.value}>{s.label} — {s.desc}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Formato de saída</Label>
                <select
                  value={value.outputFormat}
                  onChange={(e) => update('outputFormat', e.target.value as 'png' | 'jpeg' | 'webp')}
                  className="w-full h-10 rounded-lg border border-border/50 bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {FORMAT_OPTIONS.map(f => (
                    <option key={f.value} value={f.value}>{f.label} — {f.desc}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Compressão (condicional) */}
            {showCompression && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Compressão ({value.outputFormat.toUpperCase()})</Label>
                  <span className="text-xs font-semibold text-primary tabular-nums">{value.compression}%</span>
                </div>
                <Slider
                  value={[value.compression]}
                  onValueChange={([v]) => update('compression', v)}
                  min={0}
                  max={100}
                  step={5}
                />
                <p className="text-[10px] text-muted-foreground">
                  Maior = melhor qualidade e arquivo mais pesado. 75% costuma ser ideal.
                </p>
              </div>
            )}

            {/* Background + Quantidade */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  Fundo
                  <Tooltip>
                    <TooltipTrigger asChild><Info className="h-3 w-3 text-muted-foreground" /></TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">Opaco força fundo sólido. Auto deixa o modelo decidir conforme o prompt.</TooltipContent>
                  </Tooltip>
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {(['auto', 'opaque'] as const).map(bg => (
                    <button
                      key={bg}
                      type="button"
                      onClick={() => update('background', bg)}
                      className={`h-10 rounded-lg border text-xs font-semibold transition-all ${
                        value.background === bg ? 'border-primary bg-primary/5 text-primary' : 'border-border/50 bg-background text-muted-foreground hover:bg-muted/40'
                      }`}
                    >
                      {bg === 'auto' ? 'Automático' : 'Opaco'}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Quantidade de imagens</Label>
                  <span className="text-xs font-semibold text-primary tabular-nums">{value.n}×</span>
                </div>
                <Slider value={[value.n]} onValueChange={([v]) => update('n', v)} min={1} max={4} step={1} />
                <p className="text-[10px] text-muted-foreground">
                  Cada imagem extra cobra créditos separadamente.
                </p>
              </div>
            </div>

            {/* Streaming progressivo */}
            <div className="rounded-xl border border-border/40 bg-muted/20 p-3 flex items-start gap-3">
              <div className="flex-1">
                <Label className="text-xs font-semibold flex items-center gap-1.5">
                  Prévia progressiva
                  <Badge variant="outline" className="text-[9px] font-medium px-1.5 py-0">Beta</Badge>
                </Label>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Mostra 1 a 3 prévias da imagem enquanto ela é gerada (como o ChatGPT).
                </p>
                {value.partialImages > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <Slider
                      value={[value.partialImages]}
                      onValueChange={([v]) => update('partialImages', v)}
                      min={1}
                      max={3}
                      step={1}
                      className="flex-1 max-w-[160px]"
                    />
                    <span className="text-xs font-semibold text-primary tabular-nums">{value.partialImages} prévia{value.partialImages > 1 ? 's' : ''}</span>
                  </div>
                )}
              </div>
              <Switch
                checked={value.partialImages > 0}
                onCheckedChange={(c) => update('partialImages', c ? 2 : 0)}
              />
            </div>

            {/* ============== MODO EDIÇÃO (/v1/images/edits) ============== */}
            <EditModeSection value={value} update={update} />
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
