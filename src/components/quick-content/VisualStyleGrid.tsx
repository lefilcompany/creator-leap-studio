import { useState } from "react";
import { Camera, Layers, Sparkles, Eye, Flower2, Brush, Palette, PenTool, ImageIcon, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import imgRealistic from "@/assets/styles/realistic.jpg";
import imgAnimated from "@/assets/styles/animated.jpg";
import imgCartoon from "@/assets/styles/cartoon.jpg";
import imgAnime from "@/assets/styles/anime.jpg";
import imgWatercolor from "@/assets/styles/watercolor.jpg";
import imgOilPainting from "@/assets/styles/oil_painting.jpg";
import imgDigitalArt from "@/assets/styles/digital_art.jpg";
import imgSketch from "@/assets/styles/sketch.jpg";
import imgMinimalist from "@/assets/styles/minimalist.jpg";
import imgVintage from "@/assets/styles/vintage.jpg";

const VISUAL_STYLES = [
  { value: "realistic", label: "Fotorealístico", desc: "Fotos com aparência real e natural, como uma fotografia profissional", icon: Camera, image: imgRealistic },
  { value: "animated", label: "Animado / 3D", desc: "Personagens e cenários em 3D com volume e profundidade, estilo Pixar", icon: Layers, image: imgAnimated },
  { value: "cartoon", label: "Cartoon", desc: "Ilustrações coloridas e divertidas com traços simplificados", icon: Sparkles, image: imgCartoon },
  { value: "anime", label: "Anime", desc: "Estilo mangá japonês com olhos grandes e expressões marcantes", icon: Eye, image: imgAnime },
  { value: "watercolor", label: "Aquarela", desc: "Pinceladas suaves com transparência e cores que se misturam", icon: Flower2, image: imgWatercolor },
  { value: "oil_painting", label: "Pintura a Óleo", desc: "Texturas densas e ricas como quadros clássicos de museu", icon: Brush, image: imgOilPainting },
  { value: "digital_art", label: "Arte Digital", desc: "Ilustração digital moderna com cores vibrantes e detalhes nítidos", icon: Palette, image: imgDigitalArt },
  { value: "sketch", label: "Esboço", desc: "Traços a lápis com aparência de rascunho feito à mão", icon: PenTool, image: imgSketch },
  { value: "minimalist", label: "Minimalista", desc: "Design limpo com poucos elementos, formas simples e elegantes", icon: Sparkles, image: imgMinimalist },
  { value: "vintage", label: "Vintage", desc: "Estética retrô com tons sépia e granulado de filme antigo", icon: ImageIcon, image: imgVintage },
] as const;

interface VisualStyleGridProps {
  value: string;
  onChange: (value: string) => void;
}

export function VisualStyleGrid({ value, onChange }: VisualStyleGridProps) {
  const [open, setOpen] = useState(false);
  const selected = VISUAL_STYLES.find(s => s.value === value) || VISUAL_STYLES[0];
  const SelectedIcon = selected.icon;

  return (
    <div className="flex flex-col gap-2.5 h-full">
      <p className="text-sm font-bold text-foreground">Estilo Visual</p>

      {/* Selected style card */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-4 rounded-2xl bg-card shadow-sm hover:shadow-md p-3 transition-all active:scale-[0.99] text-left group"
      >
        <img
          src={selected.image}
          alt={selected.label}
          className="h-20 w-20 rounded-xl object-cover flex-shrink-0"
          loading="lazy"
          width={80}
          height={80}
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <SelectedIcon className="h-4 w-4 text-primary flex-shrink-0" />
            <span className="font-semibold text-foreground text-sm">{selected.label}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{selected.desc}</p>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0">
          <span className="hidden sm:inline">Alterar</span>
          <ChevronRight className="h-4 w-4" />
        </div>
      </button>

      {/* Modal with all styles */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Escolha o Estilo Visual</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
            {VISUAL_STYLES.map(style => {
              const Icon = style.icon;
              const isSelected = value === style.value;
              return (
                <button
                  key={style.value}
                  type="button"
                  onClick={() => { onChange(style.value); setOpen(false); }}
                  className={`flex flex-col rounded-xl overflow-hidden transition-all active:scale-[0.97] border-2 ${
                    isSelected
                      ? "border-primary shadow-lg ring-2 ring-primary/30"
                      : "border-transparent bg-card shadow-sm hover:shadow-md hover:border-muted-foreground/20"
                  }`}
                >
                  <img
                    src={style.image}
                    alt={style.label}
                    className="w-full aspect-square object-cover"
                    loading="lazy"
                    width={200}
                    height={200}
                  />
                  <div className="p-3 text-left">
                    <div className="flex items-center gap-1.5">
                      <Icon className={`h-4 w-4 flex-shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                      <span className={`text-sm font-semibold ${isSelected ? "text-primary" : "text-foreground"}`}>{style.label}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-tight line-clamp-2">{style.desc}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
