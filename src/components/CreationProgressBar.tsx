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
    <div className={cn("w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg mx-auto", className)}>
      <div className="flex items-start">
        {steps.map((step, idx) => {
          const isCompleted = idx < currentIdx;
          const isActive = idx === currentIdx;
          const isPending = idx > currentIdx;
          const isLast = idx === steps.length - 1;
          const Icon = step.icon;

          return (
            <div key={step.id} className="flex items-start flex-1 last:flex-none">
              {/* Step circle + label */}
              <div className="flex flex-col items-center gap-1 sm:gap-1.5 md:gap-2">
                <div
                  className={cn(
                    "w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 lg:w-11 lg:h-11 rounded-full flex items-center justify-center transition-all duration-300 border-2 relative z-10",
                    isCompleted && "bg-primary border-primary text-primary-foreground shadow-md shadow-primary/25",
                    isActive && step.id === "generating"
                      ? "bg-primary/15 border-primary text-primary shadow-md shadow-primary/20"
                      : isActive && "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/30",
                    isPending && "bg-background border-border text-muted-foreground"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-[18px] md:w-[18px] lg:h-5 lg:w-5" />
                  ) : isActive && step.id === "generating" ? (
                    <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-[18px] md:w-[18px] lg:h-5 lg:w-5 animate-spin" />
                  ) : (
                    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-[18px] md:w-[18px] lg:h-5 lg:w-5" />
                  )}
                </div>
                <span
                  className={cn(
                    "text-[10px] sm:text-[11px] md:text-xs lg:text-sm font-medium transition-colors duration-300 text-center whitespace-nowrap",
                    isCompleted && "text-primary",
                    isActive && "text-primary font-semibold",
                    isPending && "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line */}
              {!isLast && (
                <div className="flex-1 flex items-center pt-[15px] sm:pt-[17px] md:pt-[19px] lg:pt-[21px] px-1.5 sm:px-2 md:px-3 lg:px-4">
                  <div className="h-[2px] w-full rounded-full relative overflow-hidden bg-primary/10">
                    <div
                      className={cn(
                        "absolute inset-y-0 left-0 rounded-full bg-primary transition-all duration-700 ease-[cubic-bezier(0.4,0,0.2,1)]",
                        idx < currentIdx ? "w-full" : "w-0"
                      )}
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
