import { useCallback, useEffect, useRef, useState } from "react";
import {
  WorkflowState,
  INITIAL_WORKFLOW,
  BriefingFormData,
  ContentTemplate,
} from "@/components/create-workflow/types";

const STORAGE_KEY = "create-content-workflow:v1";

function loadPersisted(): WorkflowState {
  try {
    if (typeof window === "undefined") return INITIAL_WORKFLOW;
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_WORKFLOW;
    const parsed = JSON.parse(raw) as Partial<WorkflowState>;
    return {
      ...INITIAL_WORKFLOW,
      ...parsed,
      briefing: { ...INITIAL_WORKFLOW.briefing, ...(parsed.briefing || {}) },
    };
  } catch {
    return INITIAL_WORKFLOW;
  }
}

export function useContentWorkflow() {
  const [state, setState] = useState<WorkflowState>(loadPersisted);
  const initialized = useRef(false);

  // Persist to sessionStorage on every change (debounced minimally)
  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      return;
    }
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore quota errors
    }
  }, [state]);

  const setBriefing = useCallback((briefing: BriefingFormData) => {
    setState(s => ({ ...s, briefing }));
  }, []);

  const setTemplates = useCallback(
    (templates: ContentTemplate[], append = false) => {
      setState(s => ({
        ...s,
        templates: append ? [...s.templates, ...templates] : templates,
        selectedTemplateId:
          append || s.selectedTemplateId
            ? s.selectedTemplateId ?? templates[0]?.id ?? null
            : templates[0]?.id ?? null,
      }));
    },
    [],
  );

  const setBriefingId = useCallback((id: string | null) => {
    setState(s => ({ ...s, briefingId: id }));
  }, []);

  const selectTemplate = useCallback((id: string) => {
    setState(s => {
      const tpl = s.templates.find(t => t.id === id) || null;
      return {
        ...s,
        selectedTemplateId: id,
        editedTemplate: tpl ? { ...tpl } : s.editedTemplate,
      };
    });
  }, []);

  const setEditedTemplate = useCallback((tpl: ContentTemplate) => {
    setState(s => ({ ...s, editedTemplate: tpl }));
  }, []);

  const goToStep = useCallback((step: number) => {
    setState(s => ({
      ...s,
      currentStep: step,
      highestVisitedStep: Math.max(s.highestVisitedStep, step),
    }));
  }, []);

  const reset = useCallback(() => {
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setState(INITIAL_WORKFLOW);
  }, []);

  return {
    state,
    setBriefing,
    setBriefingId,
    setTemplates,
    selectTemplate,
    setEditedTemplate,
    goToStep,
    reset,
  };
}
