import { auth, defineMcp } from "@lovable.dev/mcp-js";

// Leitura — contexto do usuário / marca / entregáveis
import listBrandsTool from "./tools/list-brands";
import getBrandTool from "./tools/get-brand";
import listPersonasTool from "./tools/list-personas";
import getPersonaTool from "./tools/get-persona";
import listStrategicThemesTool from "./tools/list-strategic-themes";
import getStrategicThemeTool from "./tools/get-strategic-theme";
import listDeliverablesTool from "./tools/list-deliverables";
import listCategoriesTool from "./tools/list-categories";
import listFavoritesTool from "./tools/list-favorites";
import listCalendarsTool from "./tools/list-calendars";
import listCalendarItemsTool from "./tools/list-calendar-items";
import getCreditBalanceTool from "./tools/get-credit-balance";
import getProfileTool from "./tools/get-profile";

// CRUD — marcas, personas e temas
import createBrandTool from "./tools/create-brand";
import updateBrandTool from "./tools/update-brand";
import deleteBrandTool from "./tools/delete-brand";
import createPersonaTool from "./tools/create-persona";
import updatePersonaTool from "./tools/update-persona";
import deletePersonaTool from "./tools/delete-persona";
import createStrategicThemeTool from "./tools/create-strategic-theme";
import updateStrategicThemeTool from "./tools/update-strategic-theme";
import deleteStrategicThemeTool from "./tools/delete-strategic-theme";

// Criação de entregáveis — pilar I (Interações) do método AEIOU
import createCaptionTool from "./tools/create-caption";
import reviewCaptionTool from "./tools/review-caption";
import createContentPlanTool from "./tools/create-content-plan";
import createImageTool from "./tools/create-image";
import reviewImageTool from "./tools/review-image";

// Issuer OAuth: usar sempre o host Supabase direto (não o proxy .lovable.cloud).
// mcp-js valida o issuer contra o discovery document, que publica o formato
// https://<ref>.supabase.co. `VITE_SUPABASE_PROJECT_ID` é inlined pelo Vite
// em tempo de build (import-safe — sem leitura runtime de env).
const projectRef =
  import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "creator-mcp",
  title: "Creator MCP",
  version: "0.2.0",
  instructions: [
    "Servidor MCP do Creator — aplicação do pilar I (Interações) do método AEIOU dentro do Marketing OS.",
    "Toda operação age como o usuário conectado, respeitando marca, RLS, cobrança de créditos e compliance da plataforma.",
    "Tools de LEITURA (list_*, get_*) retornam entidades com `deep_link` — use-os para abrir o objeto no Creator em vez de tentar embutir a UI.",
    "Tools de CRIAÇÃO (create_*, review_*) devolvem sempre `action_id`, `deep_link` e `credits_used`. Cada `action_id` é um Entregável que pode ser anexado a um Ciclo AEIOU no Shell.",
    "Custos aproximados: create_caption ~1, review_caption ~1, review_image ~2, create_content_plan ~5, create_image ~8. Se os créditos forem insuficientes a tool retorna `isError: true` com a mensagem.",
    "Limitação conhecida: create_image entrega a imagem CRUA — o overlay de texto (headline/CTA) só é queimado quando o usuário abre a ação no Creator (Canvas 2D roda no navegador).",
    "CRUD de contexto: create_brand/update_brand/delete_brand, create_persona/update_persona/delete_persona e create_strategic_theme/update_strategic_theme/delete_strategic_theme permitem o Shell montar toda a base do briefing sem abrir o Creator. Personas e temas exigem os campos textuais obrigatórios — se algum dado for desconhecido, envie 'a definir' em vez de string vazia. Tools delete_* são destrutivas: confirme com o usuário antes de invocar.",
    "Vídeo e edição binária de imagem ainda não estão expostos por MCP — abra o Creator para essas operações.",
  ].join(" "),
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    // Leitura
    listBrandsTool,
    getBrandTool,
    listPersonasTool,
    getPersonaTool,
    listStrategicThemesTool,
    getStrategicThemeTool,
    listDeliverablesTool,
    listCategoriesTool,
    listFavoritesTool,
    listCalendarsTool,
    listCalendarItemsTool,
    getCreditBalanceTool,
    getProfileTool,
    // CRUD contexto (marcas, personas, temas)
    createBrandTool,
    updateBrandTool,
    deleteBrandTool,
    createPersonaTool,
    updatePersonaTool,
    deletePersonaTool,
    createStrategicThemeTool,
    updateStrategicThemeTool,
    deleteStrategicThemeTool,
    // Criação (pilar I — Interações)
    createCaptionTool,
    reviewCaptionTool,
    createContentPlanTool,
    createImageTool,
    reviewImageTool,
  ],
});
