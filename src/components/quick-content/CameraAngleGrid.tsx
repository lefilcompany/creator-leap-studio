import { useState } from "react";
import { Eye, ArrowDown, ArrowUp, Move, ZoomIn, Maximize, RotateCcw, User, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

import imgEyeLevel from "@/assets/angles/eye_level.jpg";
import imgTopDown from "@/assets/angles/top_down.jpg";
import imgLowAngle from "@/assets/angles/low_angle.jpg";
import imgHighAngle from "@/assets/angles/high_angle.jpg";
import imgCloseUp from "@/assets/angles/close_up.jpg";
import imgWideShot from "@/assets/angles/wide_shot.jpg";
import imgDutchAngle from "@/assets/angles/dutch_angle.jpg";
import imgAmericanShot from "@/assets/angles/american_shot.jpg";

const CAMERA_ANGLES = [
  { value: "eye_level", label: "Nível dos Olhos", desc: "Câmera na altura dos olhos, perspectiva natural e equilibrada", icon: Eye, image: imgEyeLevel },
  { value: "top_down", label: "Vista Superior", desc: "Visão de cima para baixo, ideal para flat lays e composições organizadas", icon: ArrowDown, image: imgTopDown },
  { value: "low_angle", label: "Ângulo Baixo", desc: "Câmera de baixo para cima, transmite poder e grandiosidade", icon: ArrowUp, image: imgLowAngle },
  { value: "high_angle", label: "Ângulo Alto", desc: "Câmera de cima para baixo, cria sensação de proximidade", icon: Move, image: imgHighAngle },
  { value: "close_up", label: "Close-up", desc: "Enquadramento bem próximo que destaca detalhes e texturas", icon: ZoomIn, image: imgCloseUp },
  { value: "wide_shot", label: "Plano Geral", desc: "Enquadramento amplo mostrando o contexto e ambiente completo", icon: Maximize, image: imgWideShot },
  { value: "dutch_angle", label: "Ângulo Holandês", desc: "Câmera inclinada na diagonal, cria tensão e dinamismo", icon: RotateCcw, image: imgDutchAngle },
  { value: "american_shot", label: "Plano Americano", desc: "Enquadramento dos joelhos para cima, equilibra expressão e ação corporal", icon: User, image: imgAmericanShot },
] as const;

interface CameraAngleGridProps {
  value: string;
  onChange: (value: string) => void;
}

export function CameraAngleGrid({ value, onChange }: CameraAngleGridProps) {
  const [open, setOpen] = useState(false);
  const selected = CAMERA_ANGLES.find(a => a.value === value) || CAMERA_ANGLES[0];
  const SelectedIcon = selected.icon;

  return (
    <div className="flex flex-col gap-2.5 h-full">
      <p className="text-base font-bold text-foreground">Ponto de Vista</p>

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-4 rounded-2xl bg-card shadow-sm hover:shadow-md p-3 transition-all active:scale-[0.99] text-left group flex-1"
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Escolha o Ponto de Vista</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {CAMERA_ANGLES.map(angle => {
              const Icon = angle.icon;
              const isSelected = value === angle.value;
              return (
                <button
                  key={angle.value}
                  type="button"
                  onClick={() => { onChange(angle.value); setOpen(false); }}
                  className={`flex flex-col rounded-xl overflow-hidden transition-all active:scale-[0.97] border-2 ${
                    isSelected
                      ? "border-primary shadow-lg ring-2 ring-primary/30"
                      : "border-transparent bg-card shadow-sm hover:shadow-md hover:border-muted-foreground/20"
                  }`}
                >
                  <img
                    src={angle.image}
                    alt={angle.label}
                    className="w-full aspect-square object-cover"
                    loading="lazy"
                    width={200}
                    height={200}
                  />
                  <div className="p-3 text-left">
                    <div className="flex items-center gap-1.5">
                      <Icon className={`h-4 w-4 flex-shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                      <span className={`text-sm font-semibold ${isSelected ? "text-primary" : "text-foreground"}`}>{angle.label}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-1 leading-tight line-clamp-2">{angle.desc}</p>
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
