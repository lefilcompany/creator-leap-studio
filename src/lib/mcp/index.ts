import { auth, defineMcp } from "@lovable.dev/mcp-js";

import listBrandsTool from "./tools/list-brands";
import listPersonasTool from "./tools/list-personas";
import listStrategicThemesTool from "./tools/list-strategic-themes";
import listRecentActionsTool from "./tools/list-recent-actions";
import getCreditBalanceTool from "./tools/get-credit-balance";
import getProfileTool from "./tools/get-profile";

// Sempre use o host Supabase direto como issuer (não o proxy .lovable.cloud):
// mcp-js valida o issuer contra o discovery document, que publica o formato
// https://<ref>.supabase.co. `VITE_SUPABASE_PROJECT_ID` é inlined pelo Vite
// em tempo de build, então continua import-safe (nenhuma leitura runtime de env).
const projectRef =
  import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "creator-mcp",
  title: "Creator MCP",
  version: "0.1.0",
  instructions:
    "Ferramentas do Creator: leia marcas, personas, temas estratégicos, ações recentes, saldo de créditos e perfil do usuário autenticado. Todas as ferramentas respeitam as políticas de acesso (RLS) do Creator e agem como o usuário conectado.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    listBrandsTool,
    listPersonasTool,
    listStrategicThemesTool,
    listRecentActionsTool,
    getCreditBalanceTool,
    getProfileTool,
  ],
});
