import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getCreditsTool from "./tools/get-credits";
import listBrandsTool from "./tools/list-brands";
import listRecentContentTool from "./tools/list-recent-content";

// Direct Supabase host is required as OAuth issuer — never the .lovable.cloud proxy.
// See app-mcp-server-authoring knowledge for details.
const projectRef =
  import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "creator-mcp",
  title: "Creator (Lefil) MCP",
  version: "0.1.0",
  instructions:
    "Ferramentas do Creator (Lefil). Use `get_credits` para consultar créditos, `list_brands` para listar marcas do usuário e `list_recent_content` para ver conteúdos gerados recentes. Todas as ferramentas atuam como o usuário autenticado.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getCreditsTool, listBrandsTool, listRecentContentTool],
});
