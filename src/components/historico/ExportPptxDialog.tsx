import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, Loader2, Sparkles, Coins } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { CREDIT_COSTS } from '@/lib/creditCosts';

export interface ExportPptxOptions {
  periodStart?: Date;
  periodEnd?: Date;
  removeWatermark: boolean;
}

interface ExportPptxDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  userCredits: number;
  onConfirm: (options: ExportPptxOptions) => Promise<void> | void;
}

export function ExportPptxDialog({
  open,
  onOpenChange,
  selectedCount,
  userCredits,
  onConfirm,
}: ExportPptxDialogProps) {
  const [mode, setMode] = useState<'none' | 'period'>('none');
  const [periodStart, setPeriodStart] = useState<Date | undefined>();
  const [periodEnd, setPeriodEnd] = useState<Date | undefined>();
  const [removeWatermark, setRemoveWatermark] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const cost = CREDIT_COSTS.PPTX_EXPORT_NO_WATERMARK;
  const canAffordRemoval = userCredits >= cost;

  const periodError = useMemo(() => {
    if (mode !== 'period') return null;
    if (!periodStart || !periodEnd) return 'Selecione as duas datas';
    if (periodStart > periodEnd) return 'A data inicial deve ser anterior à data final';
    return null;
  }, [mode, periodStart, periodEnd]);

  const isValid = !periodError && (!removeWatermark || canAffordRemoval);

  const handleConfirm = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    try {
      await onConfirm({
        periodStart: mode === 'period' ? periodStart : undefined,
        periodEnd: mode === 'period' ? periodEnd : undefined,
        removeWatermark,
      });
      // reset
      setMode('none');
      setPeriodStart(undefined);
      setPeriodEnd(undefined);
      setRemoveWatermark(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !submitting && onOpenChange(v)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Exportar para PowerPoint</DialogTitle>
          <DialogDescription>
            Personalize a apresentação antes de gerar o arquivo .pptx
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Period */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Período de referência</Label>
            <RadioGroup value={mode} onValueChange={(v) => setMode(v as 'none' | 'period')} className="space-y-2">
              <div className="flex items-start gap-2.5 rounded-lg border border-border p-3 hover:bg-muted/30 transition-colors">
                <RadioGroupItem value="none" id="mode-none" className="mt-0.5" />
                <Label htmlFor="mode-none" className="flex-1 cursor-pointer space-y-0.5">
                  <div className="text-sm font-medium">Sem período específico</div>
                  <div className="text-xs text-muted-foreground">Usa a data de hoje na capa</div>
                </Label>
              </div>
              <div className={cn(
                "rounded-lg border border-border p-3 transition-colors",
                mode === 'period' ? "bg-muted/20" : "hover:bg-muted/30"
              )}>
                <div className="flex items-start gap-2.5">
                  <RadioGroupItem value="period" id="mode-period" className="mt-0.5" />
                  <Label htmlFor="mode-period" className="flex-1 cursor-pointer space-y-0.5">
                    <div className="text-sm font-medium">Conteúdo de um período</div>
                    <div className="text-xs text-muted-foreground">Define um intervalo na capa</div>
                  </Label>
                </div>

                {mode === 'period' && (
                  <div className="mt-3 grid grid-cols-2 gap-2 pl-6">
                    <DatePickerField
                      label="De"
                      value={periodStart}
                      onChange={setPeriodStart}
                    />
                    <DatePickerField
                      label="Até"
                      value={periodEnd}
                      onChange={setPeriodEnd}
                    />
                  </div>
                )}
              </div>
            </RadioGroup>
            {periodError && (
              <p className="text-xs text-destructive pl-1">{periodError}</p>
            )}
          </div>

          {/* Watermark */}
          <div className="space-y-2">
            <div className={cn(
              "flex items-start gap-3 rounded-lg border border-border p-3",
              !canAffordRemoval && "opacity-60"
            )}>
              <Switch
                id="remove-watermark"
                checked={removeWatermark}
                onCheckedChange={setRemoveWatermark}
                disabled={!canAffordRemoval}
                className="mt-0.5"
              />
              <Label htmlFor="remove-watermark" className="flex-1 cursor-pointer space-y-0.5">
                <div className="text-sm font-medium flex items-center gap-1.5">
                  Exportar sem marca d'água Creator
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                </div>
                <div className="text-xs text-muted-foreground">
                  Consome {cost} créditos da sua conta
                </div>
                {!canAffordRemoval && (
                  <div className="text-xs text-destructive pt-1">
                    Você não tem créditos suficientes
                  </div>
                )}
              </Label>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground pl-1">
              <Coins className="h-3 w-3" />
              <span>Você tem <strong className="text-foreground">{userCredits}</strong> {userCredits === 1 ? 'crédito' : 'créditos'} disponíveis</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!isValid || submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                Exportar ({selectedCount})
                {removeWatermark && <span className="ml-1.5 text-xs opacity-80">−{cost} créd</span>}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DatePickerField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Date | undefined;
  onChange: (d: Date | undefined) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] text-muted-foreground uppercase tracking-wide">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className={cn(
              "w-full justify-start text-left font-normal h-9",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="h-3.5 w-3.5 mr-1.5" />
            {value ? format(value, "dd/MM/yyyy", { locale: ptBR }) : <span>Selecione</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={onChange}
            initialFocus
            locale={ptBR}
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
