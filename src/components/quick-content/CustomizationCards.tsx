import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { X, ChevronDown, Building2, UserRound, Palette } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useState } from "react";

interface Option {
  value: string;
  label: string;
}

interface CustomizationCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  loading?: boolean;
}

function CustomizationCard({ icon, title, description, options, value, onChange, disabled, loading }: CustomizationCardProps) {
  const [open, setOpen] = useState(false);
  const selected = value ? options.find(o => o.value === value) : null;

  if (loading) return <Skeleton className="h-24 w-full rounded-xl" />;

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={`flex-1 min-w-0 flex flex-col rounded-xl p-3 text-left transition-all ${
            disabled
              ? "bg-muted/40 opacity-60 cursor-not-allowed"
              : "bg-card shadow-sm cursor-pointer active:scale-[0.98]"
          } ${selected ? "ring-1 ring-primary/30" : ""}`}
        >
          {/* Header */}
          <div className="flex items-center gap-2 w-full">
            <div className="flex-shrink-0 text-muted-foreground">{icon}</div>
            <span className="text-xs font-semibold text-foreground flex-1 min-w-0 break-words">{title}</span>
            <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1 break-words">{description}</p>

          {/* Footer — selected tag */}
          <div className="mt-2 min-h-[22px]">
            {selected ? (
              <Badge
                variant="secondary"
                className="gap-1 px-2 py-0.5 text-[10px] font-medium bg-primary/10 text-primary border border-primary/20 max-w-full"
              >
                <span className="truncate">{selected.label}</span>
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); onChange(""); }}
                  className="flex-shrink-0 rounded-full p-0.5 hover:bg-destructive/20 hover:text-destructive transition-colors"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </Badge>
            ) : (
              <span className="text-[10px] text-muted-foreground/50">Nenhum selecionado</span>
            )}
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="w-56 p-1.5 rounded-xl max-h-60 overflow-y-auto">
        {options.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">Nenhuma opção disponível</p>
        ) : (
          options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all ${
                value === opt.value ? "bg-primary/10 text-primary font-medium" : "text-foreground hover:bg-muted/60"
              }`}
            >
              {opt.label}
            </button>
          ))
        )}
      </PopoverContent>
    </Popover>
  );
}

interface CustomizationCardsProps {
  brands: { id: string; name: string }[];
  personas: { id: string; name: string }[];
  themes: { id: string; title: string }[];
  formData: { brandId: string; personaId: string; themeId: string };
  onFormChange: (updates: Partial<{ brandId: string; personaId: string; themeId: string }>) => void;
  loadingBrands: boolean;
  loadingPersonas: boolean;
  loadingThemes: boolean;
}

export function CustomizationCards({
  brands, personas, themes, formData, onFormChange,
  loadingBrands, loadingPersonas, loadingThemes,
}: CustomizationCardsProps) {
  return (
    <div className="flex flex-col gap-2.5 h-full">
      <p className="text-sm font-bold text-foreground">Personalizações <span className="text-xs font-normal text-muted-foreground">(opcional)</span></p>
      <div className="flex gap-2 flex-1">
        <CustomizationCard
          icon={<Building2 className="h-4 w-4" />}
          title="Marca"
          description="Vincular a uma marca"
          options={brands.map(b => ({ value: b.id, label: b.name }))}
          value={formData.brandId}
          onChange={v => onFormChange({ brandId: v, ...(v ? {} : { personaId: "", themeId: "" }) })}
          loading={loadingBrands}
        />
        <CustomizationCard
          icon={<UserRound className="h-4 w-4" />}
          title="Persona"
          description="Público-alvo"
          options={personas.map((p: any) => ({ value: p.id, label: p.name }))}
          value={formData.personaId}
          onChange={v => onFormChange({ personaId: v })}
          disabled={!formData.brandId}
          loading={loadingPersonas}
        />
        <CustomizationCard
          icon={<Palette className="h-4 w-4" />}
          title="Tema"
          description="Tema estratégico"
          options={themes.map((t: any) => ({ value: t.id, label: t.title }))}
          value={formData.themeId}
          onChange={v => onFormChange({ themeId: v })}
          disabled={!formData.brandId}
          loading={loadingThemes}
        />
      </div>
    </div>
  );
}
