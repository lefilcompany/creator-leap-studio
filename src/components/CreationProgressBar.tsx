import { cn } from "@/lib/utils";
import { Check, Loader2, Settings2, Sparkles, ImageIcon, Type } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type CreationStep = "config" | "generating" | "edit" | "result";

interface CreationProgressBarProps {
  currentStep: CreationStep;
  /** Show a spinner on the active step (e.g. while applying text overlay). */
  activeLoading?: boolean;
  /** Compact variant for tight spaces (e.g. page headers). */
  compact?: boolean;
  className?: string;
}

const steps: { id: CreationStep; label: string; icon: LucideIcon }[] = [
  { id: "config", label: "Configuração", icon: Settings2 },
  { id: "generating", label: "Gerando", icon: Sparkles },
  { id: "edit", label: "Editar texto", icon: Type },
  { id: "result", label: "Resultado", icon: ImageIcon },
];

const stepIndex = { config: 0, generating: 1, edit: 2, result: 3 };

export function CreationProgressBar({ currentStep, activeLoading, compact, className }: CreationProgressBarProps) {
  const currentIdx = stepIndex[currentStep];

  // Sizing tokens — change here to scale the entire bar.
  const circle = compact ? "w-6 h-6" : "w-9 h-9";
  const icon = compact ? "h-3 w-3" : "h-4 w-4";
  const label = compact ? "text-[10px]" : "text-xs";
  const minW = compact ? "min-w-[56px]" : "min-w-[72px]";
  const underline = compact ? "h-[2px] w-8" : "h-[2.5px] w-12";
  const gap = compact ? "gap-0.5" : "gap-1.5";
  const connectorOffset = compact ? "-mt-5" : "-mt-8";

  return (
    <div className={cn("w-full mx-auto", className)}>
      <div className="flex items-center">
        {steps.map((step, idx) => {
          const isCompleted = idx < currentIdx;
          const isActive = idx === currentIdx;
          const isPending = idx > currentIdx;
          const isLast = idx === steps.length - 1;
          const showSpinner = isActive && (step.id === "generating" || activeLoading);

          return (
            <div key={step.id} className={cn("flex items-center", !isLast && "flex-1")}>
              {/* Step circle + label */}
              <div className={cn("flex flex-col items-center", gap, minW)}>
                <div
                  className={cn(
                    circle,
                    "rounded-full flex items-center justify-center transition-all duration-300 font-bold relative z-10",
                    isCompleted && "bg-primary text-primary-foreground shadow-sm",
                    isActive && "bg-primary text-primary-foreground shadow-md shadow-primary/30",
                    isPending && "bg-muted text-muted-foreground/40"
                  )}
                >
                  {isCompleted ? (
                    <Check className={icon} strokeWidth={3} />
                  ) : showSpinner ? (
                    <Loader2 className={cn(icon, "animate-spin")} />
                  ) : (
                    <step.icon className={icon} />
                  )}
                </div>

                <span
                  className={cn(
                    label,
                    "font-medium transition-colors duration-300 text-center whitespace-nowrap leading-tight",
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
                    underline,
                    "rounded-full transition-all duration-300",
                    (isCompleted || isActive) ? "bg-primary" : "bg-border/40"
                  )}
                />
              </div>

              {/* Connector line — vertically centered with circle */}
              {!isLast && (
                <div className={cn("flex-1 h-[2px] mx-[-4px]", connectorOffset)}>
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
