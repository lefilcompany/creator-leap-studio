
# Alinhamento do MCP do Creator com o Marketing OS

## Contexto

O **Marketing OS Shell** (`Marketing OS Orchestrator` = docs/PRD/ADRs; `Marketing OS` = implementação TanStack Start) já registra o Creator como provider MCP OAuth em `src/lib/mcp.server.ts` (`resource: https://afxwqkrneraatgovhpkb.supabase.co/functions/v1/mcp`) e chama nossas tools via `listMcpTools` / `callMcpTool` (`src/lib/mcp.functions.ts`), com o token OAuth do usuário do Shell.

No vocabulário do `CONTEXT.md` do Orchestrator, o Creator ocupa o **pilar I — Interações** e o resultado de cada tool precisa poder virar um **Entregável** dentro de um **Ciclo AEIOU** (associado a uma **Marca**, não à organização). O agente orquestrador do Shell pergunta antes de executar tools destrutivas e roda subagentes em paralelo para leitura.

O manifest atual (`.lovable/mcp/manifest.json`) expõe apenas 6 tools de leitura genéricas (`list_brands`, `list_personas`, `list_strategic_themes`, `list_recent_actions`, `get_credit_balance`, `get_profile`). Isso não representa o valor do Creator (interações/criação), nem entrega o formato de "Entregável" que o Shell espera.

## Objetivo

Reorganizar `src/lib/mcp/` para que o Creator, do lado do Shell, apareça como uma app de **Interações** que:

1. **Lê** contexto de marca/persona/tema/histórico para o orquestrador raciocinar.
2. **Cria entregáveis** (caption, imagem crua, plano, review) devolvendo sempre um `action_id`, `deep_link` e `credits_used` — os três campos que o Shell precisa para materializar um Entregável e um deep link (CONTEXT §4).
3. Respeita as limitações reais já documentadas em `docs/MCP_POSSIBILIDADES.md` (timeout ~30–60s, overlay client-side, vídeo assíncrono).

Nada da autenticação OAuth muda — o fluxo `configure_oauth_server` + `/.lovable/oauth/consent` + `defineMcp({ auth: auth.oauth.issuer(...) })` continua igual.

## Mudanças propostas

### 1. Renomear/ajustar tools existentes para vocabulário AEIOU

| Antes | Depois | Motivo |
|---|---|---|
| `list_brands` | `list_brands` (mantém, mas `description` cita "marca = workspace/brand no vocabulário AEIOU") | Alinhamento léxico. |
| `list_personas` | `list_personas` (mantém; aceita `brand_id` obrigatório quando informado) | Sem mudança funcional. |
| `list_strategic_themes` | `list_strategic_themes` (mantém) | — |
| `list_recent_actions` | `list_deliverables` | "Entregável" é o termo do CONTEXT §2. Mantém alias interno para `actions` no banco. |
| `get_credit_balance` | `get_credit_balance` (mantém) | — |
| `get_profile` | `get_profile` (mantém) | — |

Além disso, adicionar em **todas** as tools de leitura o campo `deep_link` na `structuredContent` (ex.: `https://pla.creator.lefil.com.br/historico/<action_id>`), para o Shell renderizar como link em vez de tentar embutir a UI (CONTEXT §4 — Deep link).

### 2. Novas tools de leitura (baixo esforço, alto valor para o orquestrador)

Novos arquivos em `src/lib/mcp/tools/`:

- `get_brand.ts` — detalhe + identidade visual + `brand_style_preferences`. Necessário para o agente do Shell montar briefing coerente antes de chamar `create_caption` / `create_image`.
- `list_categories.ts` — categorias de ações (respeita roles Dono/Editor/Leitor da memória `categories/system-architecture`).
- `list_favorites.ts` — favoritos "para mim" / "para a equipe" (útil como referência de estilo para o orquestrador).
- `list_calendars.ts` + `list_calendar_items.ts` — calendários e itens por etapa (`calendar`/`briefing`/`design`/`review`/`done`). Casa direto com o conceito de Ciclo do AEIOU.

### 3. Novas tools de criação (o "coração" do Creator no pilar I)

Todas delegam para as Edge Functions existentes, que já fazem débito atômico, compliance e RLS. As tools apenas empacotam entrada/saída no formato Entregável.

| Tool | Delega para | Anotações MCP | Retorno |
|---|---|---|---|
| `create_caption` | `generate-caption` | `readOnlyHint: false, destructiveHint: false` | `{ action_id, text, hashtags, credits_used, deep_link }` |
| `review_caption` | `review-caption` | idem | `{ action_id, feedback, credits_used, deep_link }` |
| `create_content_plan` | `generate-plan` | idem | `{ action_id, plan_markdown, credits_used, deep_link }` |
| `create_image` | `generate-image` | idem, mas `description` cita explicitamente: **"Entrega imagem crua; o overlay de texto só é aplicado quando o usuário abre o Creator. Custa ~8 créditos."** | `{ action_id, image_url, overlay_status: 'pending' \| 'not_needed', credits_used, deep_link }` |
| `review_image` | `review-image` | idem | `{ action_id, feedback, credits_used, deep_link }` |

Tools **NÃO expostas nesta iteração** (com justificativa registrada no arquivo):

- `generate-video` / `animate-image` — exigem padrão start+poll (duas tools) e o Shell ainda não tem UI de polling. Deixar para issue própria.
- `edit-image` — depende de upload binário; aguarda decisão sobre base64 vs URL.
- Escrita destrutiva (`soft_delete_action`, `restore_action`, `create_brand`, etc.) — o Shell hoje só precisa ler + criar entregáveis; destrutivas exigem confirmação no orquestrador (CONTEXT §4) que ainda não temos padronizada.

### 4. Instructions do servidor

Reescrever `instructions` em `src/lib/mcp/index.ts` para o vocabulário AEIOU, deixando claro para o orquestrador do Shell:

- Que este servidor é a **aplicação Creator** do **pilar I (Interações)**.
- Que toda operação age como o usuário conectado, respeitando marca ativa, RLS, créditos e compliance.
- Que respostas de criação sempre trazem `action_id` + `deep_link` para virarem Entregáveis.
- Que operações que custam créditos são anotadas com custo no `description`.

### 5. Utilitário compartilhado

Novo `src/lib/mcp/deepLink.ts` com `buildDeepLink(kind, id)` para padronizar as URLs (`/historico/<id>`, `/marca/<id>`, `/planejamento/<id>`, etc.). Evita string mágica espalhada nas tools.

### 6. Re-extrair manifest + redeploy

Depois das edições:

1. `app_mcp_server--extract_mcp_manifest` para regenerar `.lovable/mcp/manifest.json`.
2. `supabase--deploy_edge_functions` com `function_names: ["mcp"]` para publicar a Edge Function regenerada (o plugin do Vite reescreve `supabase/functions/mcp/index.ts` no build, mas o deploy é passo separado).
3. Atualizar `docs/MCP_POSSIBILIDADES.md` refletindo o novo catálogo e a semântica de Entregável.

## Fora do escopo desta iteração

- OAuth/consent (já funciona).
- Alterações no Shell (`Marketing OS`) — o Shell descobre tools via `tools/list`, então adotar as novas tools é automático.
- Tools de vídeo, edição de imagem, escrita destrutiva e admin/sistema — cada uma exige decisão de UX no orquestrador antes.

## Detalhes técnicos

- **Arquivos novos**: `src/lib/mcp/deepLink.ts`, `src/lib/mcp/tools/get-brand.ts`, `list-categories.ts`, `list-favorites.ts`, `list-calendars.ts`, `list-calendar-items.ts`, `create-caption.ts`, `review-caption.ts`, `create-content-plan.ts`, `create-image.ts`, `review-image.ts`.
- **Arquivos editados**: `src/lib/mcp/index.ts` (registrar novas tools + instructions atualizadas), `src/lib/mcp/tools/list-recent-actions.ts` → renomear para `list-deliverables.ts` (mantendo `action_type` como filtro, adicionando `deep_link` no output).
- **Padrão de invocação de Edge Function**: cada tool de criação usa `supabaseForUser(ctx).functions.invoke("<function-name>", { body })` — o token OAuth vai automaticamente no header, e a função existente cuida de compliance, débito e persistência em `actions`. A tool só formata o JSON de retorno para o formato Entregável.
- **Contrato de erro**: manter o padrão atual `{ content: [{ type:'text', text: err.message }], isError: true }`. Casos previstos a mapear no `description`: créditos insuficientes, compliance bloqueado, marca inexistente.
- **Import-safety**: nenhum `process.env` no topo dos arquivos (regra do skill `app-mcp-server-authoring`). Só dentro do handler, via `supabaseForUser`.
- **Deep link base**: usar `https://pla.creator.lefil.com.br` (domínio canônico da memória core), não `window.location`.
