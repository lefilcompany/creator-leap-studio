import { CreationStep } from "@/types/canvas";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CreationStepperProps {
  currentStep: CreationStep;
  credits: number;
}

export const CreationStepper = ({ currentStep, credits }: CreationStepperProps) => {
  const steps = [
    { number: CreationStep.INFORMATIONS, label: "Informações" },
    { number: CreationStep.GENERATE_IMAGE, label: "Gerar Imagem" },
    { number: CreationStep.ADJUST_IMAGE, label: "Ajustar Imagem" },
    { number: CreationStep.EDIT_CANVAS, label: "Editar no Canvas" },
    { number: CreationStep.FINALIZE, label: "Finalizar" },
  ];

  return (
    <div className="w-full bg-card border-b border-border p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-foreground">Criação de Conteúdo</h2>
          <div className="text-sm text-muted-foreground">
            Créditos: <span className="font-bold text-foreground">{credits}</span>
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          {steps.map((step, index) => (
            <div key={step.number} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div
                  className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all",
                    currentStep > step.number
                      ? "bg-primary border-primary text-primary-foreground"
                      : currentStep === step.number
                      ? "bg-primary border-primary text-primary-foreground"
                      : "bg-background border-border text-muted-foreground"
                  )}
                >
                  {currentStep > step.number ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    step.number
                  )}
                </div>
                <span
                  className={cn(
                    "text-xs mt-1 text-center hidden sm:block",
                    currentStep >= step.number
                      ? "text-foreground font-medium"
                      : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "h-0.5 flex-1 transition-all",
                    currentStep > step.number
                      ? "bg-primary"
                      : "bg-border"
                  )}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
