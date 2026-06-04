import { AlertTriangle } from "lucide-react";

interface Props {
  slidesCount: number;
  /** Threshold (inclusive) acima do qual o aviso aparece. Default: 8. */
  threshold?: number;
}

/**
 * Aviso amber-colored exibido quando o usuário escolhe um carrossel
 * "extenso" (8–10 slides por padrão). Componente isolado para facilitar
 * testes unitários e reuso fora da página de criação.
 */
export function CarouselSlidesCountWarning({ slidesCount, threshold = 8 }: Props) {
  if (slidesCount < threshold) return null;

  return (
    <div
      role="alert"
      data-testid="carousel-slides-count-warning"
      className="flex items-start gap-2.5 rounded-xl bg-amber-50 border border-amber-200 p-3 text-amber-800"
    >
      <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <div>
        <p className="text-sm font-semibold">Atenção: carrossel extenso detectado</p>
        <p className="text-xs leading-relaxed mt-0.5">
          Gerar 8 a 10 imagens simultâneas pode reduzir a qualidade final e aumentar o tempo de processamento.
          Para manter a consistência visual e resultados mais nítidos, considere dividir em carrosséis menores.
        </p>
      </div>
    </div>
  );
}
