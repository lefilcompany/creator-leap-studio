import { auth, defineMcp } from "@lovable.dev/mcp-js";

// Profile
import profileGet from "./tools/profile-get";
import profileUpdate from "./tools/profile-update";

// Credits
import creditsGet from "./tools/credits-get";
import creditsHistory from "./tools/credits-history";

// Brands
import brandsList from "./tools/brands-list";
import brandsGet from "./tools/brands-get";
import brandsCreate from "./tools/brands-create";
import brandsUpdate from "./tools/brands-update";
import brandsDelete from "./tools/brands-delete";

// Personas
import personasList from "./tools/personas-list";
import personasGet from "./tools/personas-get";
import personasCreate from "./tools/personas-create";
import personasUpdate from "./tools/personas-update";
import personasDelete from "./tools/personas-delete";

// Themes
import themesList from "./tools/themes-list";
import themesGet from "./tools/themes-get";
import themesCreate from "./tools/themes-create";
import themesUpdate from "./tools/themes-update";
import themesDelete from "./tools/themes-delete";

// Content (actions)
import contentList from "./tools/content-list";
import contentGet from "./tools/content-get";
import contentApprove from "./tools/content-approve";
import contentReject from "./tools/content-reject";
import contentArchive from "./tools/content-archive";
import contentRestore from "./tools/content-restore";
import contentFavorite from "./tools/content-favorite";
import contentUnfavorite from "./tools/content-unfavorite";

// Categories
import categoriesList from "./tools/categories-list";
import categoriesCreate from "./tools/categories-create";
import categoriesUpdate from "./tools/categories-update";
import categoriesDelete from "./tools/categories-delete";
import categoriesAddItem from "./tools/categories-add-item";
import categoriesRemoveItem from "./tools/categories-remove-item";

// Notifications
import notificationsList from "./tools/notifications-list";
import notificationsMarkRead from "./tools/notifications-mark-read";
import notificationsMarkAllRead from "./tools/notifications-mark-all-read";

// Calendar
import calendarList from "./tools/calendar-list";
import calendarGet from "./tools/calendar-get";

// Templates
import templatesList from "./tools/templates-list";

// Audit
import auditLogList from "./tools/audit-log-list";

// Direct Supabase host is required as OAuth issuer — never the .lovable.cloud proxy.
const projectRef =
  import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "creator-mcp",
  title: "Creator (Lefil) MCP",
  version: "0.2.0",
  instructions: [
    "API MCP do Creator (Lefil). Todas as ferramentas atuam como o usuário autenticado, respeitando RLS/permissões do banco.",
    "Convenção de nomes: `<recurso>_<ação>` (ex.: brands_list, brands_create, content_approve).",
    "Respostas padronizadas em structuredContent: { success, data|error, requestId, timestamp }.",
    "Operações destrutivas (delete) exigem confirm=true e são registradas em mcp_audit_log.",
    "Paginação: limit (1-100, padrão 20) e offset (>=0). Use audit_log_list para auditar operações.",
  ].join("\n"),
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [
    profileGet,
    profileUpdate,
    creditsGet,
    creditsHistory,
    brandsList,
    brandsGet,
    brandsCreate,
    brandsUpdate,
    brandsDelete,
    personasList,
    personasGet,
    personasCreate,
    personasUpdate,
    personasDelete,
    themesList,
    themesGet,
    themesCreate,
    themesUpdate,
    themesDelete,
    contentList,
    contentGet,
    contentApprove,
    contentReject,
    contentArchive,
    contentRestore,
    contentFavorite,
    contentUnfavorite,
    categoriesList,
    categoriesCreate,
    categoriesUpdate,
    categoriesDelete,
    categoriesAddItem,
    categoriesRemoveItem,
    notificationsList,
    notificationsMarkRead,
    notificationsMarkAllRead,
    calendarList,
    calendarGet,
    templatesList,
    auditLogList,
  ],
});
