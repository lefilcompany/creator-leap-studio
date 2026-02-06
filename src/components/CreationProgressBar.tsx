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
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 border-2 relative z-10",
                    isCompleted && "bg-primary border-primary text-primary-foreground shadow-md shadow-primary/25",
                    isActive && step.id === "generating"
                      ? "bg-primary/15 border-primary text-primary shadow-md shadow-primary/20"
                      : isActive && "bg-primary border-primary text-primary-foreground shadow-lg shadow-primary/30",
                    isPending && "bg-background border-border text-muted-foreground"
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
                    "text-[11px] font-medium transition-colors duration-300 text-center whitespace-nowrap",
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
                <div className="flex-1 flex items-center pt-[18px] px-1.5 sm:px-2">
                  <div className="h-[2px] w-full rounded-full relative overflow-hidden bg-border">
                    <div
                      className={cn(
                        "absolute inset-y-0 left-0 rounded-full bg-primary transition-all duration-500 ease-out",
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
