import { useEffect, useState } from "react";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

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

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) return prev;
        const increment = Math.max(0.3, (90 - prev) / 30);
        return Math.min(90, prev + increment);
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isComplete]);

  return (
    <div className="flex flex-col items-center justify-center h-full px-4 animate-fade-in py-2">
      {/* Animated logo video */}
      <div className="mb-0 md:mb-1">
        <video
          src="/images/logo-loading.webm"
          autoPlay
          loop
          muted
          playsInline
          className="w-24 h-24 md:w-32 md:h-32 lg:w-36 lg:h-36 object-contain"
        />
      </div>

      {/* Text */}
      <h2 className="text-xl md:text-2xl lg:text-3xl font-extrabold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent text-center mb-1 md:mb-2 tracking-tight max-w-xl">
        Um instante, estamos criando a imagem perfeita para você
      </h2>
      <p className="text-sm md:text-base text-muted-foreground text-center mb-4 md:mb-6 max-w-lg font-medium">
        Isso pode levar alguns segundos. Você pode navegar livremente — a geração continua em segundo plano.
      </p>

      {/* Progress bar */}
      <div className="w-full max-w-sm space-y-1">
        <Progress value={progress} className="h-2.5 bg-muted" />
        <p className="text-center text-sm font-semibold text-primary">
          {Math.round(progress)}%
        </p>
      </div>

      {/* Navigate away hint */}
      <button
        onClick={() => navigate("/dashboard")}
        className="mt-4 md:mt-6 flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Voltar ao Dashboard enquanto gera
      </button>
    </div>
  );
}
