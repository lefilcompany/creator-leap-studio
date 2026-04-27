import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { ArrowLeft, ArrowRight, Loader2, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useContentWorkflow } from "@/hooks/useContentWorkflow";
import { PageBreadcrumb } from "@/components/PageBreadcrumb";
import { CREDIT_COSTS, formatCredits } from "@/lib/creditCosts";
import { StepIndicator } from "@/components/create-workflow/StepIndicator";
import { Step1Briefing } from "@/components/create-workflow/Step1Briefing";
import { Step2Plan } from "@/components/create-workflow/Step2Plan";
import { Step3EditTemplate } from "@/components/create-workflow/Step3EditTemplate";
import { Step4Generate } from "@/components/create-workflow/Step4Generate";
import {
  WORKFLOW_STEPS,
  BriefingFormData,
  ContentTemplate,
} from "@/components/create-workflow/types";

type ErrorMap = Partial<Record<keyof BriefingFormData, string>>;

function validateBriefing(b: BriefingFormData): ErrorMap {
  const errors: ErrorMap = {};
  if (!b.brand) errors.brand = "Selecione uma marca.";
  if (!b.platform) errors.platform = "Selecione a plataforma.";
  if (!b.objective) errors.objective = "Defina o objetivo do conteúdo.";
  const idea = b.idea.trim();
  if (idea.length < 30) {
    errors.idea = "Descreva sua ideia com pelo menos 30 caracteres.";
  } else {
    // anti-repetition heuristic
    const words = idea.toLowerCase().split(/\s+/);
    const unique = new Set(words);
    if (words.length >= 8 && unique.size / words.length < 0.35) {
      errors.idea = "Evite repetir as mesmas palavras. Conte mais sobre a ideia.";
    }
  }
  return errors;
}

export default function CreateContentWorkflow() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const {
    state,
    setBriefing,
    setBriefingId,
    setTemplates,
    selectTemplate,
    setEditedTemplate,
    goToStep,
    reset,
  } = useContentWorkflow();

  const [errors, setErrors] = useState<ErrorMap>({});
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [generatingMore, setGeneratingMore] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Skip-briefing shortcut: ?skip_briefing=1 sends straight to legacy CreateImage
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("skip_briefing") === "1") {
      navigate("/create/image", { replace: true });
    }
  }, [location.search, navigate]);

  const selectedTemplate = useMemo<ContentTemplate | null>(() => {
    return (
      state.editedTemplate ||
      state.templates.find(t => t.id === state.selectedTemplateId) ||
      null
    );
  }, [state.editedTemplate, state.selectedTemplateId, state.templates]);

  const originalSelected = useMemo<ContentTemplate | null>(() => {
    return state.templates.find(t => t.id === state.selectedTemplateId) || null;
  }, [state.selectedTemplateId, state.templates]);

  /* ========== Step 1 → Step 2: generate templates ========== */
  const handleGeneratePlan = async (append = false) => {
    const validation = validateBriefing(state.briefing);
    setErrors(validation);
    if (Object.keys(validation).length > 0) {
      toast.error("Revise o briefing antes de gerar.");
      return;
    }

    if (append) setGeneratingMore(true);
    else setGeneratingPlan(true);

    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-content-templates",
        {
          body: {
            briefing: state.briefing,
            briefingId: state.briefingId,
            count: append ? 2 : 1,
          },
        },
      );
      if (error) throw error;
      if (!data?.templates?.length) throw new Error("Nenhum template retornado.");

      setTemplates(data.templates as ContentTemplate[], append);
      if (data.briefingId) setBriefingId(data.briefingId);
      if (!append) goToStep(2);
      else toast.success("Novas alternativas adicionadas.");
    } catch (err: any) {
      console.error("[workflow] generate templates error", err);
      toast.error(err?.message || "Não foi possível gerar o template.");
    } finally {
      setGeneratingPlan(false);
      setGeneratingMore(false);
    }
  };

  /* ========== Step 4: confirm & redirect to CreateImage with prefill ========== */
  const handleConfirmGenerate = () => {
    if (!selectedTemplate) {
      toast.error("Selecione um template para continuar.");
      return;
    }
    const cost = CREDIT_COSTS.CONTENT_BRIEFING_PACKAGE;
    if ((user?.credits ?? 0) < cost) {
      toast.error("Créditos insuficientes.");
      return;
    }

    setSubmitting(true);
    const t = selectedTemplate;
    const b = state.briefing;

    // Map workflow template + briefing into CreateImage prefillData shape
    const prefillData = {
      brandId: b.brand,
      themeId: b.theme || undefined,
      personaId: b.persona || undefined,
      platform: b.platform,
      contentType: b.contentType,
      tone: b.tone,
      objective: b.objective,
      prompt: t.visualDirection.description,
      additionalInfo: [b.additionalNotes, t.bigIdea].filter(Boolean).join("\n\n"),
      visualStyle: t.visualDirection.visualStyle,
      colorPalette: t.visualDirection.colorPalette,
      lighting: t.visualDirection.lighting,
      composition: t.visualDirection.composition,
      cameraAngle: t.visualDirection.cameraAngle,
      mood: t.visualDirection.mood,
      aspectRatio: t.visualDirection.aspectRatio,
      includeText: t.visualDirection.imageText.include,
      textContent: t.visualDirection.imageText.content,
      textPosition: t.visualDirection.imageText.position,
      // workflow extras (consumed downstream by caption/hashtags)
      workflowTemplate: {
        id: t.id,
        title: t.title,
        format: t.format,
        caption: t.caption,
        hashtags: t.hashtags,
        cta: t.cta,
        briefingId: state.briefingId,
      },
    };

    navigate("/create/image", { state: { prefillData, fromWorkflow: true } });
    // Keep workflow state in case user comes back; reset only on explicit cancel
    setSubmitting(false);
  };

  /* ========== Step navigation ========== */
  const handleNext = () => {
    if (state.currentStep === 1) {
      handleGeneratePlan(false);
      return;
    }
    if (state.currentStep === 2) {
      if (!state.selectedTemplateId) {
        toast.error("Selecione um template para continuar.");
        return;
      }
      // ensure editedTemplate seeded
      if (!state.editedTemplate && originalSelected) {
        setEditedTemplate({ ...originalSelected });
      }
      goToStep(3);
      return;
    }
    if (state.currentStep === 3) {
      goToStep(4);
      return;
    }
    if (state.currentStep === 4) {
      handleConfirmGenerate();
    }
  };

  const handleBack = () => {
    if (state.currentStep > 1) goToStep(state.currentStep - 1);
    else navigate("/create");
  };

  const handleStepClick = (step: number) => {
    if (step <= state.highestVisitedStep) goToStep(step);
  };

  const handleResetAndExit = () => {
    reset();
    navigate("/create");
  };

  /* ========== Render ========== */
  const isLastStep = state.currentStep === 4;
  const nextDisabled =
    (state.currentStep === 1 && generatingPlan) ||
    (state.currentStep === 2 && !state.selectedTemplateId) ||
    (state.currentStep === 4 &&
      (submitting ||
        !selectedTemplate ||
        (user?.credits ?? 0) < CREDIT_COSTS.CONTENT_BRIEFING_PACKAGE));

  return (
    <div className="flex flex-col -m-4 sm:-m-6 lg:-m-8 min-h-screen">
      <div className="px-4 sm:px-6 lg:px-8 pt-4">
        <PageBreadcrumb
          items={[
            { label: "Criar Conteúdo", href: "/create" },
            { label: "Workflow guiado" },
          ]}
        />
      </div>

      <div className="px-4 sm:px-6 lg:px-8 pt-2 pb-4">
        {/* Header */}
        <div className="bg-card rounded-2xl shadow-md p-4 lg:p-5 flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-2.5 flex-shrink-0">
              <Wand2 className="h-5 w-5 lg:h-6 lg:w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg lg:text-xl font-bold text-foreground truncate">
                Criar conteúdo com briefing
              </h1>
              <p className="text-xs lg:text-sm text-muted-foreground truncate">
                A IA traduz sua ideia em um plano completo de imagem + legenda.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate("/create/image")}
            className="text-xs sm:text-sm text-primary hover:underline self-start md:self-auto whitespace-nowrap"
          >
            Já sei o que criar — pular briefing →
          </button>
        </div>

        {/* Stepper */}
        <Card className="p-4 lg:p-5 mb-4 rounded-2xl">
          <StepIndicator
            steps={WORKFLOW_STEPS}
            currentStep={state.currentStep}
            highestVisitedStep={state.highestVisitedStep}
            onStepClick={handleStepClick}
          />
        </Card>

        {/* Step content */}
        <Card className="p-4 sm:p-6 lg:p-8 rounded-2xl">
          {state.currentStep === 1 && (
            <Step1Briefing
              value={state.briefing}
              onChange={b => {
                setBriefing(b);
                if (Object.keys(errors).length) setErrors({});
              }}
              errors={errors}
            />
          )}
          {state.currentStep === 2 && (
            <Step2Plan
              templates={state.templates}
              selectedTemplateId={state.selectedTemplateId}
              onSelect={selectTemplate}
              loading={generatingPlan}
              generatingMore={generatingMore}
              onGenerateMore={() => handleGeneratePlan(true)}
            />
          )}
          {state.currentStep === 3 && selectedTemplate && originalSelected && (
            <Step3EditTemplate
              template={selectedTemplate}
              original={originalSelected}
              onChange={setEditedTemplate}
            />
          )}
          {state.currentStep === 4 && selectedTemplate && (
            <Step4Generate
              template={selectedTemplate}
              briefing={state.briefing}
              userCredits={user?.credits ?? 0}
            />
          )}

          {/* Empty fallback for step 3/4 if no selection */}
          {(state.currentStep === 3 || state.currentStep === 4) &&
            !selectedTemplate && (
              <div className="text-center py-12">
                <p className="text-sm text-muted-foreground">
                  Nenhum template selecionado. Volte ao plano para escolher um.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => goToStep(2)}
                >
                  Voltar ao plano
                </Button>
              </div>
            )}
        </Card>

        {/* Footer nav */}
        <div className="mt-4 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={generatingPlan || submitting}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              {state.currentStep === 1 ? "Sair" : "Voltar"}
            </Button>
            {state.currentStep > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleResetAndExit}
                className="text-muted-foreground hover:text-foreground"
              >
                Recomeçar
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {isLastStep && (
              <span className="text-xs text-muted-foreground hidden sm:inline">
                Custo: <strong className="text-foreground">
                  {formatCredits(CREDIT_COSTS.CONTENT_BRIEFING_PACKAGE)}
                </strong>
              </span>
            )}
            <Button
              type="button"
              onClick={handleNext}
              disabled={nextDisabled}
              className="gap-2 min-w-[10rem]"
            >
              {generatingPlan || submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : isLastStep ? (
                <Sparkles className="h-4 w-4" />
              ) : null}
              {state.currentStep === 1 && (generatingPlan ? "Gerando plano..." : "Gerar plano")}
              {state.currentStep === 2 && "Avançar"}
              {state.currentStep === 3 && "Revisar e gerar"}
              {state.currentStep === 4 && (submitting ? "Enviando..." : "Confirmar e gerar")}
              {!isLastStep && !generatingPlan && (
                <ArrowRight className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
