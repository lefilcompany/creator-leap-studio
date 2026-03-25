import { useState } from "react";
import { Eye, ArrowDown, ArrowUp, Move, ZoomIn, Maximize, RotateCcw, User, ChevronRight, ChevronLeft, Info, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Button } from "@/components/ui/button";

import imgEyeLevel from "@/assets/angles/eye_level.jpg";
import imgTopDown from "@/assets/angles/top_down.jpg";
import imgLowAngle from "@/assets/angles/low_angle.jpg";
import imgHighAngle from "@/assets/angles/high_angle.jpg";
import imgCloseUp from "@/assets/angles/close_up.jpg";
import imgWideShot from "@/assets/angles/wide_shot.jpg";
import imgDutchAngle from "@/assets/angles/dutch_angle.jpg";
import imgAmericanShot from "@/assets/angles/american_shot.jpg";

const CAMERA_ANGLES = [
  {
    value: "eye_level", label: "Nível dos Olhos",
    desc: "Câmera na altura dos olhos, perspectiva natural e equilibrada",
    icon: Eye, image: imgEyeLevel,
    detail: {
      what: "A câmera fica posicionada na mesma altura dos olhos do sujeito ou objeto. É o ângulo mais comum e natural na fotografia.",
      when: "Use quando quiser passar naturalidade, confiança e proximidade. Ideal para retratos, fotos de produtos em prateleiras e conteúdos que precisam parecer autênticos.",
      effect: "O espectador se sente no mesmo nível, como se estivesse olhando diretamente para o que está na foto. Transmite igualdade e conexão.",
      examples: "Fotos de perfil, depoimentos, catálogos de moda, stories do dia a dia."
    }
  },
  {
    value: "top_down", label: "Vista Superior",
    desc: "Visão de cima para baixo, ideal para flat lays e composições organizadas",
    icon: ArrowDown, image: imgTopDown,
    detail: {
      what: "A câmera aponta diretamente de cima para baixo, em um ângulo de 90 graus. Também conhecido como 'flat lay' ou 'bird's eye view'.",
      when: "Perfeito para mostrar composições organizadas, mesas postas, ingredientes de receitas, kits de produtos ou qualquer cena onde a disposição dos itens conta uma história.",
      effect: "Cria uma visão limpa e organizada. O espectador vê tudo de uma vez, como se estivesse olhando uma mesa de cima.",
      examples: "Flat lays de moda, fotos de comida, unboxings, materiais de trabalho organizados."
    }
  },
  {
    value: "low_angle", label: "Ângulo Baixo",
    desc: "Câmera de baixo para cima, transmite poder e grandiosidade",
    icon: ArrowUp, image: imgLowAngle,
    detail: {
      what: "A câmera é posicionada abaixo do sujeito, apontando para cima. Também chamado de 'contra-plongée'.",
      when: "Use para destacar força, autoridade ou imponência. Funciona bem com arquitetura, líderes, monumentos e produtos que você quer fazer parecer grandiosos.",
      effect: "O sujeito parece maior e mais poderoso. Transmite uma sensação de admiração e respeito.",
      examples: "Fotos de prédios, atletas em ação, lançamentos de produtos premium, poses de liderança."
    }
  },
  {
    value: "high_angle", label: "Ângulo Alto",
    desc: "Câmera de cima para baixo, cria sensação de proximidade",
    icon: Move, image: imgHighAngle,
    detail: {
      what: "A câmera fica acima do sujeito, olhando para baixo em um ângulo inclinado. Diferente da vista superior, aqui ainda se vê profundidade e perspectiva.",
      when: "Use para criar intimidade, mostrar vulnerabilidade ou dar contexto ao ambiente ao redor do sujeito.",
      effect: "O sujeito parece menor e mais acessível. Cria uma sensação acolhedora e envolvente.",
      examples: "Selfies de cima, crianças brincando, pets, cenas de café e lifestyle."
    }
  },
  {
    value: "close_up", label: "Close-up",
    desc: "Enquadramento bem próximo que destaca detalhes e texturas",
    icon: ZoomIn, image: imgCloseUp,
    detail: {
      what: "A câmera se aproxima muito do sujeito, preenchendo quase todo o quadro com um detalhe específico. Mostra texturas, expressões e detalhes que passariam despercebidos.",
      when: "Use para destacar a qualidade de um produto, capturar emoções em um rosto, mostrar ingredientes ou ressaltar acabamentos e materiais.",
      effect: "Cria impacto visual forte e direciona a atenção do espectador para um ponto específico. Transmite intensidade e cuidado com detalhes.",
      examples: "Texturas de tecidos, gotas de água em frutas, expressões faciais, detalhes de joias e relógios."
    }
  },
  {
    value: "wide_shot", label: "Plano Geral",
    desc: "Enquadramento amplo mostrando o contexto e ambiente completo",
    icon: Maximize, image: imgWideShot,
    detail: {
      what: "A câmera se afasta para capturar uma cena ampla, mostrando o sujeito dentro do seu ambiente completo. O contexto ao redor é tão importante quanto o sujeito principal.",
      when: "Use para contar uma história visual mais completa, mostrar locações, paisagens, eventos ou situar uma pessoa em um cenário.",
      effect: "O espectador entende o contexto geral. Transmite liberdade, amplitude e narrativa visual.",
      examples: "Paisagens, fotos de viagem, ambientes de loja, cenários de eventos, lifestyle ao ar livre."
    }
  },
  {
    value: "dutch_angle", label: "Ângulo Holandês",
    desc: "Câmera inclinada na diagonal, cria tensão e dinamismo",
    icon: RotateCcw, image: imgDutchAngle,
    detail: {
      what: "A câmera é inclinada lateralmente, fazendo com que a linha do horizonte fique diagonal. Também chamado de 'dutch tilt' ou 'ângulo oblíquo'.",
      when: "Use para criar uma sensação de movimento, tensão ou criatividade. Funciona bem em conteúdos mais ousados, editoriais de moda e posts que querem se destacar.",
      effect: "Quebra a monotonia visual e chama atenção imediata. Transmite energia, inquietação ou um toque artístico.",
      examples: "Editoriais de moda, posts criativos, fotos urbanas, conteúdo de música e entretenimento."
    }
  },
  {
    value: "american_shot", label: "Plano Americano",
    desc: "Enquadramento dos joelhos para cima, equilibra expressão e ação corporal",
    icon: User, image: imgAmericanShot,
    detail: {
      what: "A câmera enquadra a pessoa dos joelhos (ou coxas) para cima. Surgiu no cinema western americano para mostrar os cowboys com seus coldres.",
      when: "Use quando quiser mostrar a pessoa com expressão facial visível e, ao mesmo tempo, incluir gestos e linguagem corporal. Ideal para moda, apresentações e conteúdo profissional.",
      effect: "Equilibra o rosto e o corpo, mostrando personalidade sem perder o contexto da roupa ou postura. Transmite presença e atitude.",
      examples: "Lookbooks de moda, apresentadores, tutoriais, fotos corporativas casuais, influenciadores."
    }
  },
] as const;

interface CameraAngleGridProps {
  value: string;
  onChange: (value: string) => void;
}

export function CameraAngleGrid({ value, onChange }: CameraAngleGridProps) {
  const [open, setOpen] = useState(false);
  const [detailAngle, setDetailAngle] = useState<string | null>(null);
  const selected = CAMERA_ANGLES.find(a => a.value === value) || CAMERA_ANGLES[0];
  const SelectedIcon = selected.icon;
  const detailData = detailAngle ? CAMERA_ANGLES.find(a => a.value === detailAngle) : null;

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

      {/* Overlay backdrop */}
      {open && (
        <div className="fixed inset-0 z-50 bg-black/80 animate-in fade-in-0" onClick={() => { setOpen(false); setDetailAngle(null); }} />
      )}

      {/* Two independent panels side by side */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center gap-4 p-4 pointer-events-none">
          {/* Left: Grid panel — no scroll */}
          <div className={`pointer-events-auto flex flex-col bg-background border rounded-lg shadow-lg overflow-hidden transition-all duration-300 ${detailAngle ? "hidden sm:flex sm:max-w-[42rem]" : "max-w-[52rem]"} w-full max-h-[85vh]`}>
            <div className="p-6 pb-3 flex-shrink-0 relative">
              <DialogHeader>
                <DialogTitle>Escolha o Ponto de Vista</DialogTitle>
                <p className="text-sm text-muted-foreground mt-1">Selecione o ângulo da câmera ou clique no ícone de detalhes para saber mais.</p>
              </DialogHeader>
              <button
                type="button"
                onClick={() => { setOpen(false); setDetailAngle(null); }}
                className="group absolute right-2.5 top-2.5 sm:right-3 sm:top-3 rounded-lg p-1 bg-transparent opacity-80 ring-offset-background transition-all duration-200 hover:opacity-100 hover:bg-primary/20 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 z-50"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="sr-only">Fechar</span>
              </button>
            </div>
            <div className="px-6 pb-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {CAMERA_ANGLES.map(angle => {
                  const Icon = angle.icon;
                  const isSelected = value === angle.value;
                  const isDetailOpen = detailAngle === angle.value;
                  return (
                    <button
                      key={angle.value}
                      type="button"
                      onClick={() => { onChange(angle.value); }}
                      className={`relative flex flex-col rounded-xl overflow-hidden transition-all active:scale-[0.97] border-2 group/card ${
                        isDetailOpen
                          ? "border-primary/50 bg-primary/5 shadow-md"
                          : isSelected
                            ? "border-primary shadow-lg ring-2 ring-primary/30"
                            : "border-transparent bg-card shadow-sm hover:shadow-md hover:border-muted-foreground/20"
                      }`}
                    >
                      <div className="relative">
                        <img
                          src={angle.image}
                          alt={angle.label}
                          className="w-full aspect-[4/3] object-cover"
                          loading="lazy"
                          width={200}
                          height={150}
                        />
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={(e) => { e.stopPropagation(); setDetailAngle(prev => prev === angle.value ? null : angle.value); }}
                          onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); setDetailAngle(prev => prev === angle.value ? null : angle.value); }}}
                          className={`absolute top-1.5 right-1.5 p-1.5 rounded-lg backdrop-blur-sm transition-all ${
                            isDetailOpen
                              ? "bg-primary text-primary-foreground shadow-md"
                              : "bg-black/40 text-white opacity-0 group-hover/card:opacity-100 hover:bg-black/60"
                          }`}
                        >
                          <Info className="h-3.5 w-3.5" />
                        </div>
                      </div>
                      <div className="p-2.5 text-left">
                        <div className="flex items-center gap-1.5">
                          <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                          <span className={`text-xs font-semibold truncate ${isSelected ? "text-primary" : "text-foreground"}`}>{angle.label}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Detail panel — independent, with scroll */}
          {detailData && (() => {
            const DetailIcon = detailData.icon;
            return (
              <div className="pointer-events-auto flex flex-col bg-background border rounded-lg shadow-lg overflow-hidden w-full max-w-[22rem] max-h-[85vh] animate-in slide-in-from-right-4 fade-in-0 duration-200">
                <div className="p-4 border-b border-border flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => setDetailAngle(null)}
                    className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <DetailIcon className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="font-semibold text-foreground text-sm truncate">{detailData.label}</span>
                  </div>
                  {value === detailData.value && (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                      <Check className="h-3 w-3" /> Ativo
                    </span>
                  )}
                </div>

                <div className="flex-1 overflow-y-auto">
                  <div className="p-5 space-y-5">
                    <img
                      src={detailData.image}
                      alt={detailData.label}
                      className="w-full aspect-video object-cover rounded-xl shadow-sm"
                      width={400}
                      height={225}
                    />
                    <div className="space-y-4">
                      <div>
                        <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">O que é?</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">{detailData.detail.what}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">Quando usar?</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">{detailData.detail.when}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">Que efeito causa?</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">{detailData.detail.effect}</p>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">Exemplos de uso</p>
                        <p className="text-sm text-muted-foreground leading-relaxed">{detailData.detail.examples}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-4 border-t border-border flex-shrink-0">
                  <Button
                    className="w-full gap-2"
                    onClick={() => { onChange(detailData.value); setOpen(false); setDetailAngle(null); }}
                  >
                    <Check className="h-4 w-4" />
                    {value === detailData.value ? "Manter seleção" : `Usar ${detailData.label}`}
                  </Button>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
