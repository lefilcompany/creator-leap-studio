import { cn } from "@/lib/utils";
import { Check, Loader2 } from "lucide-react";

export type CreationStep = "config" | "generating" | "result";

interface CreationProgressBarProps {
  currentStep: CreationStep;
  className?: string;
}

const steps = [
  { id: "config" as const, label: "Configuração", number: 1 },
  { id: "generating" as const, label: "Gerando", number: 2 },
  { id: "result" as const, label: "Resultado", number: 3 },
];

const stepIndex = { config: 0, generating: 1, result: 2 };

export function CreationProgressBar({ currentStep, className }: CreationProgressBarProps) {
  const currentIdx = stepIndex[currentStep];

  return (
    <div className={cn("w-full mx-auto", className)}>
      <div className="flex items-center">
        {steps.map((step, idx) => {
          const isCompleted = idx < currentIdx;
          const isActive = idx === currentIdx;
          const isPending = idx > currentIdx;
          const isLast = idx === steps.length - 1;

          return (
            <div key={step.id} className={cn("flex items-center", !isLast && "flex-1")}>
              {/* Step circle + label */}
              <div className="flex flex-col items-center gap-1.5 min-w-[72px]">
                <div
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 text-sm font-bold relative z-10",
                    isCompleted && "bg-primary text-primary-foreground shadow-sm",
                    isActive && step.id === "generating"
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : isActive && "bg-primary text-primary-foreground shadow-md shadow-primary/30",
                    isPending && "bg-muted text-muted-foreground/40"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" strokeWidth={3} />
                  ) : isActive && step.id === "generating" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    step.number
                  )}
                </div>

                <span
                  className={cn(
                    "text-xs font-medium transition-colors duration-300 text-center whitespace-nowrap",
                    isCompleted && "text-primary",
                    isActive && "text-primary font-semibold",
                    isPending && "text-muted-foreground/40"
                  )}
                >
                  {step.label}
                </span>

                {/* Underline indicator */}
                <div
                  className={cn(
                    "h-[2.5px] w-12 rounded-full transition-all duration-300",
                    (isCompleted || isActive) ? "bg-primary" : "bg-border/40"
                  )}
                />
              </div>

              {/* Connector line — vertically centered with circle */}
              {!isLast && (
                <div className="flex-1 h-[2px] -mt-8 mx-[-4px]">
                  <div
                    className={cn(
                      "h-full w-full rounded-full transition-all duration-500",
                      isCompleted ? "bg-primary" : "bg-border/30"
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
