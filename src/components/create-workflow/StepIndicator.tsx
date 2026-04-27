import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WorkflowStep {
  id: number;
  label: string;
  shortLabel?: string;
}

interface StepIndicatorProps {
  steps: WorkflowStep[];
  currentStep: number;
  highestVisitedStep: number;
  onStepClick?: (stepId: number) => void;
}

export function StepIndicator({
  steps,
  currentStep,
  highestVisitedStep,
  onStepClick,
}: StepIndicatorProps) {
  return (
    <nav aria-label="Progresso do workflow" className="w-full">
      {/* Desktop: horizontal */}
      <ol className="hidden sm:flex items-center justify-between w-full gap-2">
        {steps.map((step, idx) => {
          const isComplete = step.id < currentStep;
          const isCurrent = step.id === currentStep;
          const isClickable = step.id <= highestVisitedStep && step.id !== currentStep;

          return (
            <li key={step.id} className="flex items-center flex-1 min-w-0">
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onStepClick?.(step.id)}
                aria-current={isCurrent ? "step" : undefined}
                className={cn(
                  "flex items-center gap-2.5 min-w-0",
                  isClickable && "cursor-pointer hover:opacity-80",
                  !isClickable && !isCurrent && "cursor-not-allowed",
                )}
              >
                <span
                  className={cn(
                    "flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors",
                    isComplete && "bg-primary text-primary-foreground",
                    isCurrent && "bg-primary/20 text-primary border-2 border-primary",
                    !isComplete && !isCurrent && "bg-muted text-muted-foreground border border-border",
                  )}
                >
                  {isComplete ? <Check className="h-4 w-4" /> : step.id}
                </span>
                <span
                  className={cn(
                    "text-sm font-medium truncate hidden md:inline",
                    isCurrent && "text-foreground",
                    isComplete && "text-foreground",
                    !isComplete && !isCurrent && "text-muted-foreground",
                  )}
                >
                  {step.label}
                </span>
              </button>
              {idx < steps.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-px mx-3 transition-colors",
                    step.id < currentStep ? "bg-primary" : "bg-border",
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>

      {/* Mobile: compact label */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-muted-foreground">
            Etapa {currentStep} de {steps.length}
          </span>
          <span className="text-sm font-bold text-foreground">
            {steps.find(s => s.id === currentStep)?.label}
          </span>
        </div>
        <div className="flex gap-1">
          {steps.map(step => (
            <div
              key={step.id}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors",
                step.id < currentStep && "bg-primary",
                step.id === currentStep && "bg-primary/60",
                step.id > currentStep && "bg-muted",
              )}
            />
          ))}
        </div>
      </div>
    </nav>
  );
}
