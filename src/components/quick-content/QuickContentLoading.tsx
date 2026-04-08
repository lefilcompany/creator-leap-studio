import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import logoLoading from "/images/logo-loading.gif";

interface QuickContentLoadingProps {
  isComplete: boolean;
}

export function QuickContentLoading({ isComplete }: QuickContentLoadingProps) {
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (isComplete) {
      setProgress(100);
      return;
    }

    // Simulate progress: 0→90% over ~30s with easing
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        // Slow down as it gets higher
        const increment = Math.max(0.3, (90 - prev) / 30);
        return Math.min(90, prev + increment);
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isComplete]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 animate-fade-in">
      {/* Pulsing logo */}
      <div className="mb-8">
        <img
          src={logoLoading}
          alt="Carregando"
          className="w-32 h-32 object-contain animate-[pulse-scale_2s_ease-in-out_infinite]"
        />
      </div>

      {/* Text */}
      <h2 className="text-xl md:text-2xl font-bold text-foreground text-center mb-2">
        Um instante, estamos criando a imagem perfeita para você
      </h2>
      <p className="text-sm text-muted-foreground text-center mb-8 max-w-md">
        Isso pode levar alguns segundos. Você pode navegar livremente — a geração continua em segundo plano.
      </p>

      {/* Progress bar */}
      <div className="w-full max-w-sm space-y-2">
        <Progress value={progress} className="h-3 bg-muted" />
        <p className="text-center text-sm font-semibold text-primary">
          {Math.round(progress)}%
        </p>
      </div>

      {/* Navigate away hint */}
      <button
        onClick={() => navigate("/dashboard")}
        className="mt-8 flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar ao Dashboard enquanto gera
      </button>
    </div>
  );
}
