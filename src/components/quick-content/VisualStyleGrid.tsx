import { Camera, Layers, Sparkles, Eye, Flower2, Brush, Palette, PenTool, ImageIcon } from "lucide-react";

const VISUAL_STYLES = [
  { value: "realistic", label: "Fotorealístico", desc: "Fotos com aparência real e natural, como uma fotografia profissional", icon: Camera, bg: "bg-blue-50 dark:bg-blue-950/40", ring: "ring-blue-400", iconColor: "text-blue-600 dark:text-blue-400" },
  { value: "animated", label: "Animado / 3D", desc: "Personagens e cenários em 3D com volume e profundidade, estilo Pixar", icon: Layers, bg: "bg-violet-50 dark:bg-violet-950/40", ring: "ring-violet-400", iconColor: "text-violet-600 dark:text-violet-400" },
  { value: "cartoon", label: "Cartoon", desc: "Ilustrações coloridas e divertidas com traços simplificados", icon: Sparkles, bg: "bg-orange-50 dark:bg-orange-950/40", ring: "ring-orange-400", iconColor: "text-orange-600 dark:text-orange-400" },
  { value: "anime", label: "Anime", desc: "Estilo mangá japonês com olhos grandes e expressões marcantes", icon: Eye, bg: "bg-pink-50 dark:bg-pink-950/40", ring: "ring-pink-400", iconColor: "text-pink-600 dark:text-pink-400" },
  { value: "watercolor", label: "Aquarela", desc: "Pinceladas suaves com transparência e cores que se misturam", icon: Flower2, bg: "bg-teal-50 dark:bg-teal-950/40", ring: "ring-teal-400", iconColor: "text-teal-600 dark:text-teal-400" },
  { value: "oil_painting", label: "Pintura a Óleo", desc: "Texturas densas e ricas como quadros clássicos de museu", icon: Brush, bg: "bg-amber-50 dark:bg-amber-950/40", ring: "ring-amber-400", iconColor: "text-amber-600 dark:text-amber-400" },
  { value: "digital_art", label: "Arte Digital", desc: "Ilustração digital moderna com cores vibrantes e detalhes nítidos", icon: Palette, bg: "bg-indigo-50 dark:bg-indigo-950/40", ring: "ring-indigo-400", iconColor: "text-indigo-600 dark:text-indigo-400" },
  { value: "sketch", label: "Esboço", desc: "Traços a lápis com aparência de rascunho feito à mão", icon: PenTool, bg: "bg-stone-50 dark:bg-stone-950/40", ring: "ring-stone-400", iconColor: "text-stone-600 dark:text-stone-400" },
  { value: "minimalist", label: "Minimalista", desc: "Design limpo com poucos elementos, formas simples e elegantes", icon: Sparkles, bg: "bg-slate-50 dark:bg-slate-950/40", ring: "ring-slate-400", iconColor: "text-slate-600 dark:text-slate-400" },
  { value: "vintage", label: "Vintage", desc: "Estética retrô com tons sépia e granulado de filme antigo", icon: ImageIcon, bg: "bg-yellow-50 dark:bg-yellow-950/40", ring: "ring-yellow-400", iconColor: "text-yellow-600 dark:text-yellow-400" },
] as const;

interface VisualStyleGridProps {
  value: string;
  onChange: (value: string) => void;
}

export function VisualStyleGrid({ value, onChange }: VisualStyleGridProps) {
  return (
    <div className="space-y-2.5">
      <p className="text-sm font-bold text-foreground">Estilo Visual</p>
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide md:grid md:grid-cols-5 md:overflow-visible">
        {VISUAL_STYLES.map(style => {
          const Icon = style.icon;
          const isSelected = value === style.value;
          return (
            <button
              key={style.value}
              type="button"
              onClick={() => onChange(style.value)}
              className={`flex-shrink-0 w-[110px] md:w-auto flex flex-col items-center gap-1.5 rounded-xl p-3 text-center transition-all active:scale-[0.97] border-0 ${
                isSelected
                  ? `${style.bg} shadow-lg ring-2 ${style.ring} scale-[1.02]`
                  : `bg-card shadow-sm hover:shadow-md`
              }`}
            >
              <div className={`rounded-lg p-2 ${style.bg}`}>
                <Icon className={`h-5 w-5 ${isSelected ? style.iconColor : "text-muted-foreground"}`} />
              </div>
              <span className={`text-xs font-semibold leading-tight ${isSelected ? "text-foreground" : "text-muted-foreground"}`}>
                {style.label}
              </span>
              <span className="text-[10px] text-muted-foreground leading-tight line-clamp-2 hidden md:block">
                {style.desc}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
