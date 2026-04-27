export interface VisualDirection {
  description: string;
  visualStyle: string;
  mood: string;
  lighting: string;
  composition: string;
  cameraAngle: string;
  colorPalette: string;
  aspectRatio: string;
  imageText: {
    include: boolean;
    content: string;
    position: string;
  };
}

export interface ContentTemplate {
  id: string;
  title: string;
  format: string;
  bigIdea: string;
  summary: string;
  caption: string;
  hashtags: string[];
  cta: string;
  visualDirection: VisualDirection;
}

export interface BriefingFormData {
  brand: string;
  theme: string;
  persona: string;
  platform: string;
  objective: string;
  contentType: "organic" | "ads";
  idea: string;
  tone: string[];
  additionalNotes: string;
}

export interface WorkflowState {
  currentStep: number;
  highestVisitedStep: number;
  briefing: BriefingFormData;
  briefingId: string | null;
  templates: ContentTemplate[];
  selectedTemplateId: string | null;
  editedTemplate: ContentTemplate | null;
}

export const INITIAL_BRIEFING: BriefingFormData = {
  brand: "",
  theme: "",
  persona: "",
  platform: "",
  objective: "",
  contentType: "organic",
  idea: "",
  tone: [],
  additionalNotes: "",
};

export const INITIAL_WORKFLOW: WorkflowState = {
  currentStep: 1,
  highestVisitedStep: 1,
  briefing: INITIAL_BRIEFING,
  briefingId: null,
  templates: [],
  selectedTemplateId: null,
  editedTemplate: null,
};

export const WORKFLOW_STEPS = [
  { id: 1, label: "Briefing" },
  { id: 2, label: "Plano" },
  { id: 3, label: "Editar" },
  { id: 4, label: "Gerar" },
];
