import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useBackgroundTasks } from "@/contexts/BackgroundTaskContext";
import { CREDIT_COSTS } from "@/lib/creditCosts";
import { toast } from "sonner";
import type { TemplateFillInput, BrandTemplate } from "@/types/template";

export interface GenerateFromTemplateInput {
  template: BrandTemplate;
  fills: TemplateFillInput[];
  background_mode: "reuse" | "new";
  background_prompt?: string;
  include_logo?: boolean;
}

export interface GenerateFromTemplateResult {
  action_id: string;
  image_url?: string;
}

export function useGenerateFromTemplate() {
  const { user, refreshUserCredits } = useAuth();
  const { addTask } = useBackgroundTasks();
  const navigate = useNavigate();

  const start = useCallback(
    (input: GenerateFromTemplateInput) => {
      const cost = CREDIT_COSTS.TEMPLATE_IMAGE;
      const credits = user?.credits ?? 0;
      if (credits < cost) {
        toast.error("Créditos insuficientes", {
          description: `Esta ação requer ${cost} créditos. Você tem ${credits}.`,
        });
        navigate("/credits");
        return null;
      }

      return addTask(
        `Template: ${input.template.name ?? "imagem"}`,
        "template-generate",
        async (onProgress) => {
          onProgress("Preparando template...");
          const { data, error } = await supabase.functions.invoke("generate-from-template", {
            body: {
              template_id: input.template.id,
              fills: input.fills,
              background_mode: input.background_mode,
              background_prompt: input.background_prompt,
              include_logo: input.include_logo ?? true,
            },
          });
          if (error) {
            // 422 → compliance; 402 → créditos
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const ctx = (error as any).context;
            const status = ctx?.status ?? 0;
            if (status === 402) {
              throw new Error("Créditos insuficientes. Compre mais créditos para continuar.");
            }
            if (status === 422) {
              const body = ctx?.body ? JSON.parse(ctx.body) : {};
              throw new Error(body?.message ?? "Conteúdo bloqueado pela revisão de compliance.");
            }
            throw new Error(error.message || "Erro ao gerar imagem do template");
          }
          await refreshUserCredits();
          onProgress("Imagem gerada!");
          const result = data as GenerateFromTemplateResult;
          return {
            route: `/action/${result.action_id}`,
            state: { actionId: result.action_id },
          };
        },
      );
    },
    [user, addTask, navigate, refreshUserCredits],
  );

  return { start, cost: CREDIT_COSTS.TEMPLATE_IMAGE };
}
