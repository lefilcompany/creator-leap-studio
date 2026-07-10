# Creator MCP — API para agentes externos

MCP server oficial do Creator (Lefil). Todas as ferramentas atuam **como o usuário autenticado**, respeitando as políticas RLS do Supabase e o modelo de permissões do app. Nenhuma tool usa `service_role`.

- **Endpoint**: `https://lcpmqnkorcsclmpfbizr.supabase.co/functions/v1/mcp`
- **Transport**: MCP Streamable HTTP
- **Auth**: OAuth 2.1 (managed Supabase Auth authorization server) — clientes fazem *dynamic client registration*
- **Manifesto**: `.lovable/mcp/manifest.json`
- **Fonte das tools**: `src/lib/mcp/tools/*`
- **Server entry**: `src/lib/mcp/index.ts`

Ao editar/adicionar/remover uma tool, rode `app_mcp_server--extract_mcp_manifest` e depois faça deploy da edge function `mcp`.

## 1. Configuração de cliente

### ChatGPT / Claude / Cursor / Codex

Adicione um MCP server apontando para a URL acima. Os clientes que suportam OAuth 2.1 + DCR (Dynamic Client Registration) se registram automaticamente. O fluxo:

1. O cliente descobre a metadata via `.well-known/oauth-protected-resource`.
2. Redireciona o usuário para a página de consentimento (`/.lovable/oauth/consent`) do Creator.
3. O usuário faz login (email/senha ou Google) e aprova.
4. O cliente recebe o token de acesso e passa a chamar as tools como esse usuário.

### Chamada crua (para debug)

```bash
curl -X POST https://lcpmqnkorcsclmpfbizr.supabase.co/functions/v1/mcp \
  -H "Authorization: Bearer <token-oauth-mcp>" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## 2. Convenções

### Nomes de tools

`<recurso>_<ação>`, apenas letras minúsculas e underscores. Exemplos: `brands_list`, `personas_create`, `content_approve`, `categories_add_item`.

### Resposta padronizada

Toda resposta possui `structuredContent` no formato:

**Sucesso:**
```json
{
  "success": true,
  "data": { ... },
  "requestId": "uuid",
  "timestamp": "2026-07-10T..."
}
```

**Erro:**
```json
{
  "success": false,
  "error": { "code": "not_found", "message": "..." },
  "requestId": "uuid",
  "timestamp": "..."
}
```

### Códigos de erro comuns

| Código | Significado |
|---|---|
| `unauthenticated` | Faltando ou inválido o token OAuth |
| `forbidden` | Papel/permissão insuficiente (ex.: exige system admin) |
| `not_found` | Recurso inexistente ou fora do escopo RLS do usuário |
| `invalid_input` | Parâmetros ausentes ou inválidos |
| `confirmation_required` | Operação destrutiva sem `confirm=true` |
| `db_error` | Erro do banco (mensagem original preservada) |
| `permission_check_failed` | Falha ao consultar RPC de papel |

### Paginação

Tools de listagem aceitam `limit` (1–100, padrão 20) e `offset` (>=0). Retornam `{ items, total, limit, offset }`.

### Operações destrutivas

Toda tool marcada com `destructiveHint: true` exige `confirm: true` no input e grava linha em `mcp_audit_log`.

## 3. Matriz de permissões

O modelo de permissões efetivo é o RLS do Supabase. Cada tool declara abaixo a permissão *lógica* que ela exige — mas a checagem real é feita no banco.

| Tool | Permissão lógica | Escopo real (RLS) |
|---|---|---|
| `profile_get` | `profile:read` | Somente o próprio usuário |
| `profile_update` | `profile:update` | Somente o próprio usuário; não permite alterar email/plano/créditos |
| `credits_get` | `credits:read` | Somente o próprio usuário |
| `credits_history` | `credits:read` | Somente do próprio usuário |
| `brands_list` / `brands_get` | `brands:read` | Marcas do usuário ou da sua equipe |
| `brands_create` | `brands:create` | Vinculado ao usuário/equipe atual |
| `brands_update` | `brands:update` | Somente marcas onde RLS permite update |
| `brands_delete` | `brands:delete` | Destrutivo; RLS restringe ao dono |
| `personas_*` | `personas:{read,create,update,delete}` | Espelha RLS de `personas` |
| `themes_*` | `themes:{read,create,update,delete}` | Espelha RLS de `strategic_themes` |
| `content_list` / `content_get` | `content:read` | Espelha RLS de `actions` |
| `content_approve` / `content_reject` | `content:update` | Requer update em `actions` |
| `content_archive` / `content_restore` | `content:delete` | Soft delete via `deleted_at` |
| `content_favorite` / `content_unfavorite` | `content:update` | Insere/remove em `action_favorites` do próprio usuário |
| `categories_list` | `categories:read` | Categorias próprias ou compartilhadas (via `can_access_category`) |
| `categories_create` | `categories:create` | Vincula ao usuário; `visibility=team` exige team_id |
| `categories_update` / `categories_delete` | `categories:{update,delete}` | Requer papel de Dono (RLS) |
| `categories_add_item` / `categories_remove_item` | `categories:update` | Requer Dono ou Editor (`can_edit_category`) |
| `notifications_*` | `notifications:{read,update}` | Somente notificações do próprio usuário |
| `calendar_list` / `calendar_get` | `calendar:read` | RLS de `content_calendars` + `calendar_items` |
| `templates_list` | `templates:read` | RLS de `brand_templates` |
| `audit_log_list` | `audit:read` | Próprios registros; system admin vê todos |

## 4. Auditoria

Toda operação de escrita/exclusão grava uma linha em `public.mcp_audit_log` contendo:

- `user_id`, `tool_name`, `action`, `resource_type`, `resource_id`
- `success`, `error_code`, `error_message`
- `client_id` (OAuth client), `metadata`, `created_at`

Consulta via `audit_log_list`. Cada usuário vê os próprios registros; administradores de sistema (papel `system`) veem todos.

## 5. Exemplos de chamada

### Listar marcas do usuário

```json
{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"brands_list","arguments":{"search":"lefil","limit":10}}}
```

### Criar persona

```json
{
  "jsonrpc":"2.0","id":2,"method":"tools/call",
  "params":{"name":"personas_create","arguments":{
    "brand_id":"...","name":"Ana Marketeira","age":"28-35",
    "main_goal":"Aumentar reconhecimento de marca no Instagram"
  }}
}
```

### Aprovar conteúdo

```json
{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"content_approve","arguments":{"id":"..."}}}
```

### Excluir marca (destrutivo)

```json
{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"brands_delete","arguments":{"id":"...","confirm":true}}}
```

## 6. Segurança

- **RLS é a fonte da verdade de autorização**. Nenhuma tool usa `service_role`.
- Tools nunca retornam senhas, hashes, tokens Stripe, chaves de API ou segredos (o helper `stripSensitive` filtra colunas conhecidas).
- Operações destrutivas exigem `confirm=true`.
- Consumo de créditos permanece exclusivo das edge functions de geração; nenhuma tool MCP consome créditos por si só (previne abuso de billing).
- Todas as operações de escrita gravam auditoria imutável em `mcp_audit_log`.
- Rate limiting e revogação de tokens são geridos pelo Supabase Auth (authorization server).

## 7. Ferramentas ausentes por design

As tools abaixo foram consideradas e **não expostas** intencionalmente:

- **`content_generate` / geração de imagem/vídeo/carrossel**: consome créditos e envolve pipeline de moderação. Ainda não exposto por MCP para prevenir gastos indiretos disparados por agentes; será adicionado com salvaguardas específicas (limites por token, dry-run).
- **`redeem_coupon` / `checkout` / `stripe_*`**: fluxos financeiros só existem por edge function autenticada + UI; expor via MCP amplia superfície de fraude.
- **`users_admin_*` / `teams_admin_*`**: operações administrativas de sistema. Serão adicionadas em release futuro com checagem `has_role('system')` obrigatória.
- **`account_delete` / `account_deactivate`**: irreversível; mantido apenas via UI com verificação de senha.

## 8. Ciclo de manutenção

Ao editar as tools:

1. Modifique arquivos em `src/lib/mcp/tools/*` ou `src/lib/mcp/index.ts`.
2. Rode `app_mcp_server--extract_mcp_manifest` para atualizar `.lovable/mcp/manifest.json`.
3. Faça deploy da edge function `mcp` (`supabase--deploy_edge_functions` com `function_names: ["mcp"]`).
4. Clientes MCP recarregam o catálogo automaticamente na próxima conexão.
