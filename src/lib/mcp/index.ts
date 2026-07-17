import { auth, defineMcp } from "@lovable.dev/mcp-js";

// Existentes
import echoTool from "./tools/echo";
import getProfileTool from "./tools/get-profile";
import listBrandsTool from "./tools/list-brands";

// Marcas
import getBrandTool from "./tools/brands/get-brand";
import createBrandTool from "./tools/brands/create-brand";
import updateBrandTool from "./tools/brands/update-brand";
import deleteBrandTool from "./tools/brands/delete-brand";

// Personas
import listPersonasTool from "./tools/personas/list-personas";
import getPersonaTool from "./tools/personas/get-persona";
import createPersonaTool from "./tools/personas/create-persona";
import updatePersonaTool from "./tools/personas/update-persona";
import deletePersonaTool from "./tools/personas/delete-persona";

// Temas
import listThemesTool from "./tools/themes/list-themes";
import getThemeTool from "./tools/themes/get-theme";
import createThemeTool from "./tools/themes/create-theme";
import updateThemeTool from "./tools/themes/update-theme";
import deleteThemeTool from "./tools/themes/delete-theme";

// Criação de conteúdo
import createImageContentTool from "./tools/content/create-image-content";
import createQuickContentTool from "./tools/content/create-quick-content";
import generateCaptionTool from "./tools/content/generate-caption";
import createContentPlanTool from "./tools/content/create-content-plan";

// Revisão
import reviewImageTool from "./tools/review/review-image";
import reviewCaptionTool from "./tools/review/review-caption";
import reviewTextForImageTool from "./tools/review/review-text-for-image";

// Contexto
import getCreditBalanceTool from "./tools/context/get-credit-balance";
import listCalendarsTool from "./tools/context/list-calendars";
import listCalendarItemsTool from "./tools/context/list-calendar-items";
import listActionsTool from "./tools/context/list-actions";
import getActionTool from "./tools/context/get-action";

// Runtime resolver — usa o SUPABASE_URL da edge (projeto real onde a função roda),
// caindo para VITE_SUPABASE_PROJECT_ID apenas durante o eval do extractor de manifesto.
function resolveOauthIssuer(): string {
  try {
    const runtimeUrl =
      typeof process !== "undefined" ? process.env?.SUPABASE_URL : undefined;
    if (runtimeUrl) {
      const ref = new URL(runtimeUrl).hostname.split(".")[0];
      return `https://${ref}.supabase.co/auth/v1`;
    }
  } catch {
    // ignore — cai no fallback de build
  }
  const buildRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";
  return `https://${buildRef}.supabase.co/auth/v1`;
}

export default defineMcp({
  name: "creator-mcp",
  title: "Creator MCP",
  version: "1.0.0",
  instructions:
    "Ferramentas do Creator para agentes de marketing. Antes de gerar qualquer peça, verifique se a marca já existe com list_brands; se não existir, use create_brand. Depois consulte list_personas e list_themes para contexto. Use create_image_content para o pipeline completo (com marca/persona/tema/tom) ou create_quick_content para prompt livre. generate_caption produz legendas; review_image, review_caption e review_text_for_image aplicam ajustes. create_content_plan gera um calendário de conteúdo.",
  auth: auth.oauth.issuer({
    issuer: resolveOauthIssuer(),
    acceptedAudiences: "authenticated",
    // Aceita também sessões diretas do app (signInWithPassword) para o painel
    // de teste em /mcp-docs. RLS continua sendo a proteção real dos dados.
    requireOAuthClientClaim: false,
  }),
  tools: [
    echoTool,
    getProfileTool,
    // marcas
    listBrandsTool,
    getBrandTool,
    createBrandTool,
    updateBrandTool,
    deleteBrandTool,
    // personas
    listPersonasTool,
    getPersonaTool,
    createPersonaTool,
    updatePersonaTool,
    deletePersonaTool,
    // temas
    listThemesTool,
    getThemeTool,
    createThemeTool,
    updateThemeTool,
    deleteThemeTool,
    // criação
    createImageContentTool,
    createQuickContentTool,
    generateCaptionTool,
    createContentPlanTool,
    // revisão
    reviewImageTool,
    reviewCaptionTool,
    reviewTextForImageTool,
    // contexto
    getCreditBalanceTool,
    listCalendarsTool,
    listCalendarItemsTool,
    listActionsTool,
    getActionTool,
  ],
});
