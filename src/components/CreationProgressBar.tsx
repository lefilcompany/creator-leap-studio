import { cn } from "@/lib/utils";
import { Check, Settings2, Loader2, ImageIcon } from "lucide-react";

export type CreationStep = "config" | "generating" | "result";

interface CreationProgressBarProps {
  currentStep: CreationStep;
  className?: string;
}

const steps = [
  { id: "config" as const, label: "Configuração", icon: Settings2 },
  { id: "generating" as const, label: "Gerando", icon: Loader2 },
  { id: "result" as const, label: "Resultado", icon: ImageIcon },
];

const stepIndex = { config: 0, generating: 1, result: 2 };

export function CreationProgressBar({ currentStep, className }: CreationProgressBarProps) {
  const currentIdx = stepIndex[currentStep];

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-center justify-between relative">
        {/* Connecting lines */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-border/40 mx-8 sm:mx-12" />
        <div
          className="absolute top-4 left-0 h-0.5 bg-primary mx-8 sm:mx-12 transition-all duration-500 ease-out"
          style={{
            width: currentIdx === 0 ? "0%" : currentIdx === 1 ? "calc(50% - 2rem)" : "calc(100% - 4rem)",
          }}
        />

        {steps.map((step, idx) => {
          const isCompleted = idx < currentIdx;
          const isActive = idx === currentIdx;
          const isPending = idx > currentIdx;
          const Icon = step.icon;

          return (
            <div key={step.id} className="flex flex-col items-center gap-1.5 z-10 flex-1">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 border-2",
                  isCompleted && "bg-primary border-primary text-primary-foreground shadow-md shadow-primary/25",
                  isActive && step.id === "generating"
                    ? "bg-primary/10 border-primary text-primary animate-pulse shadow-md shadow-primary/20"
                    : isActive && "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/30",
                  isPending && "bg-muted/50 border-border/50 text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : isActive && step.id === "generating" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Icon className="h-4 w-4" />
                )}
              </div>
              <span
                className={cn(
                  "text-xs font-medium transition-colors duration-300 text-center",
                  (isCompleted || isActive) ? "text-primary" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
