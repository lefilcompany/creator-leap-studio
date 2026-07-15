# MCP no Creator — Guia de Possibilidades e Limitações

> Documento de referência para decidir **o que expor** via MCP (Model Context Protocol),
> **como cada ferramenta funcionaria** (em termos de requisições HTTP) e **quais são
> os limites técnicos reais** do sistema atual.
> Nenhuma alteração de código é feita aqui — é apenas um mapa do território.

---

## 1. O que é o MCP no contexto do Creator

Um servidor MCP transforma o Creator em uma "API para agentes de IA" (Claude,
ChatGPT, Cursor, Codex, etc.). Cada **tool** MCP vira uma função que o agente
externo pode chamar; o próprio agente decide quando chamar, com quais argumentos,
e como usar a resposta.

No stack atual (Vite + React + Supabase + Edge Functions Deno), o MCP seria
implementado com o pacote `@lovable.dev/mcp-js` gerando **uma Edge Function
Supabase** (`supabase/functions/mcp/index.ts`) que fica exposta em:

```
POST https://<project-ref>.supabase.co/functions/v1/mcp
```

Cada "tool" declarada em `src/lib/mcp/tools/*.ts` vira um endpoint lógico dentro
dessa função, acessível via JSON-RPC (padrão MCP Streamable HTTP):

```
POST /functions/v1/mcp
Content-Type: application/json
Accept: application/json, text/event-stream
Authorization: Bearer <access_token_do_usuário>
{
  "jsonrpc": "2.0", "id": 1, "method": "tools/call",
  "params": { "name": "list_brands", "arguments": {} }
}
```

O agente externo (ex.: Claude Desktop) apenas configura essa URL como
"connector" — a partir daí, tudo é conversa entre o modelo e o servidor.

---

## 2. Modelo de autenticação — a decisão mais importante

Há **duas opções**, e essa escolha define tudo o que vem depois:

### 2.a. **OAuth 2.1 via Supabase Auth (recomendado)**

- Cada usuário do Creator faz login no ChatGPT/Claude usando **a própria conta
  do Creator** (mesmo email/senha, ou Google).
- O agente recebe um token do Supabase e, em cada tool, o servidor MCP
  **repassa esse token** para o Postgres via `Authorization: Bearer ...`.
- Consequência crucial: **as políticas RLS do banco continuam valendo
  automaticamente**. O agente só enxerga o que aquele usuário já poderia
  enxergar no app.
- Cobrança de créditos, `user_roles`, `workspaces`, `teammate_profiles` — tudo
  respeitado sem código extra.

### 2.b. **Público (sem login)**

- Qualquer pessoa na internet pode chamar as tools.
- Só serve para dados **intencionalmente públicos** (ex.: catálogo de personas
  do marketplace, planos, preços).
- **Não pode** ler `brands`, `actions`, `credit_history`, etc. porque a role
  `anon` está bloqueada por RLS — e escalar para `service_role` significaria
  entregar o banco inteiro para a internet.

**Recomendação forte:** OAuth. O modelo público só faz sentido para 2–3 tools
de leitura de catálogo público, se algum dia isso for útil.

---

## 3. O que **pode** ser exposto — mapa de tools possíveis

Cada item abaixo é uma tool candidata. A coluna "Custo" indica se a operação
debita créditos do usuário (o débito continua acontecendo do lado do servidor
via `deductUserCredits`, exatamente como no app).

### 3.1. Leitura (GET-like, sem custo)

| Tool sugerida | O que retorna | Tabela / função |
|---|---|---|
| `list_brands` | Marcas do usuário / workspace ativo | `brands` |
| `get_brand` | Detalhes + identidade visual de uma marca | `brands` + `brand_style_preferences` |
| `list_personas` | Personas do usuário | `personas` |
| `list_themes` | Temas estratégicos | `strategic_themes` |
| `list_categories` | Categorias de ações (Dono/Editor/Leitor) | `action_categories` + `action_category_members` |
| `list_actions` | Histórico de gerações (imagens, textos, vídeos) | `actions` |
| `get_action` | Uma ação específica com URL da imagem, legenda, prompt | `actions` |
| `list_favorites` | Favoritos "para mim" ou "para a equipe" | `action_favorites` |
| `get_credits` | Saldo atual, máximo, data de expiração, plano | `profiles` (credits, max_credits, credits_expire_at, plan_id) |
| `get_credit_history` | Histórico de consumo/recarga | `credit_history` |
| `list_calendars` | Calendários de conteúdo | `content_calendars` |
| `list_calendar_items` | Itens de um calendário (briefing/design/review/done) | `calendar_items` |
| `search_marketplace_personas` | Templates públicos de personas | `persona_templates` |
| `get_platform_specs` | Specs (aspect ratio, limites) por plataforma | constante em `platformSpecs.ts` |

Todas essas viram, em HTTP puro, respostas JSON do tipo:

```json
{ "content": [{ "type": "text", "text": "[...linhas do banco em JSON...]" }],
  "structuredContent": { "items": [ ... ] } }
```

### 3.2. Escrita leve (POST/PATCH, sem custo de crédito)

| Tool | Efeito |
|---|---|
| `create_brand` | Insere em `brands` (respeita limites do plano / `free_brands_used`) |
| `update_brand` | Atualiza campos textuais de uma marca |
| `create_persona` | Insere em `personas` |
| `create_theme` | Insere em `strategic_themes` |
| `favorite_action` / `unfavorite_action` | Escreve em `action_favorites` |
| `add_action_to_category` | Escreve em `action_category_items` |
| `create_category` | Escreve em `action_categories` |
| `soft_delete_action` | Marca `deleted_at` (respeita retenção de 30 dias) |
| `restore_action` | Remove `deleted_at` |
| `create_calendar` | Cria `content_calendars` |
| `create_calendar_item` | Cria `calendar_items` (etapa `calendar`) |
| `update_calendar_item_stage` | Move item entre etapas (`briefing`→`design`→`review`→`done`) |

### 3.3. Ações **com custo de crédito** (executam Edge Functions existentes)

Estas são as tools "poderosas" — cada uma delega a lógica para a Edge Function
correspondente, que já faz débito atômico, compliance, upload, etc.

| Tool | Delegado para | Custo aproximado | Observação importante |
|---|---|---|---|
| `generate_quick_content` | `generate-quick-content` | ~4 créditos | Retorno síncrono OK (sem overlay pesado). |
| `generate_image` | `generate-image` | ~8 créditos | **⚠️ Devolve URL crua + `overlayPayload`.** O overlay de texto é feito **no cliente** (Canvas 2D). Um agente MCP **não roda Canvas**, então a legenda em imagem não seria aplicada. Ver §5. |
| `edit_image` | `edit-image` | variável | Idem generate-image quanto ao overlay. |
| `generate_caption` | `generate-caption` | ~1 crédito | 100% textual — perfeito para MCP. |
| `review_caption` | `review-caption` | ~1 crédito | 100% textual — perfeito. |
| `review_image` | `review-image` | ~2 créditos | Retorna análise textual (Gemini Vision). |
| `generate_plan` | `generate-plan` | ~5 créditos | Planejamento estratégico textual. |
| `generate_video` / `animate_image` | `generate-video` / `animate-image` | alto | **Assíncrono / longo** — ver §4 sobre timeout. |
| `generate_persona_avatar` | `generate-persona-avatar` | ~2 créditos | Retorna URL de imagem. |
| `redeem_coupon` | `redeem-coupon` | 0 (adiciona créditos) | Útil para automação. |

### 3.4. Administrativas (só para `has_role(user, 'system')`)

Se o agente for do `admin@admin.com`, tools extras poderiam existir:
`list_all_users`, `list_all_teams`, `get_system_logs`, `get_gemini_quota`,
`get_overlay_failures`, `get_stripe_revenue`. RLS + `requireSystemAdmin` já
protegem isso na camada de banco/função.

---

## 4. Limitações **duras** do MCP no stack atual

### 4.1. Timeout síncrono do MCP (~30–60s)

MCP é **request/response síncrono**. Se a tool não responder rápido, o cliente
(Claude, ChatGPT) mostra "interrupted" mesmo que o trabalho conclua no servidor.

Impacto direto:

- ✅ Ok: leitura, escrita leve, `generate-caption`, `review-*`.
- ⚠️ Limite: `generate-image`, `generate-quick-content` (Gemini pode levar
  15–40s dependendo do modelo).
- ❌ Ruim: `generate-video`, `animate-image` — geração de vídeo pode passar
  de minutos. O padrão correto é expor duas tools:
  `start_video_generation` (retorna `action_id` imediatamente) e
  `check_video_status` (polling). O usuário do agente pergunta "está pronto?"
  e o modelo consulta.

### 4.2. Overlay de texto em imagem **não roda no MCP**

Toda a arquitetura nova documentada em `CLIENT_OVERLAY_PIPELINE.md` roda
Canvas 2D **no browser**. Um agente MCP não tem browser.

Consequências:

- `generate_image` via MCP entregaria a **imagem crua do Gemini** + o
  `overlayPayload` como JSON. Sem headline/CTA queimados na imagem.
- A ação ficaria com `overlay_status='pending'` para sempre (a menos que o
  usuário abra o app e a página aplique o overlay).
- **Mitigações possíveis** (nenhuma implementada):
  1. Aceitar limitação e documentar: "geração via MCP entrega a imagem
     bruta; abra o Creator para finalizar o texto".
  2. Reintroduzir overlay server-side **apenas para a rota MCP**, aceitando
     risco de HTTP 546 (foi exatamente o que quisemos evitar).
  3. Renderizar overlay com biblioteca headless (ex.: `resvg` / `skia`) na
     Edge Function — projeto separado, com seu próprio orçamento de CPU.

### 4.3. Uploads / arquivos binários

MCP passa **texto e JSON**. Não há upload de arquivo nativo. Fluxos que hoje
recebem imagem de referência (`edit-image`, avatar de marca) precisariam de:

- URL pública já hospedada, **ou**
- Base64 no argumento da tool (limitado pelo tamanho da mensagem — na prática,
  imagens pequenas < 4–5 MB).

### 4.4. Sem streaming de tokens para o usuário final

O `platform-chat` do Creator faz streaming (SSE) do Gemini para a UI. Via MCP,
o agente externo já **é** o modelo — ele não precisa de streaming do nosso
lado. Uma tool `platform_chat` faria pouco sentido; melhor expor as tools
"puras" e deixar o Claude/ChatGPT ser o cérebro.

### 4.5. Créditos = **reais**

Toda tool que chama uma Edge Function paga debita créditos do usuário
autenticado, exatamente como no app. Isso é intencional (não há
"modo grátis via MCP"), mas convém deixar explícito no `description` de cada
tool para que o modelo avise o usuário antes de gastar.

### 4.6. Compliance e moderação continuam ativos

`checkCompliance`, guardrails de contexto político, verificação de marca — tudo
roda na Edge Function, independente do canal. O agente pode receber
`isError: true` com a razão do bloqueio.

### 4.7. Anexos ao workspace ativo

Muitas tabelas dependem de `workspaces` / `active_workspace_id`. As tools
precisam ou receber `workspace_id` como argumento **ou** ler o workspace ativo
do usuário via `get_user_active_workspace_id`. Não há UI para o agente
"trocar de workspace" — precisaria virar argumento explícito.

---

## 5. O que a resposta HTTP realmente parece

Exemplo concreto de chamada e resposta (formato MCP Streamable HTTP):

**Requisição do agente → nosso MCP**

```http
POST /functions/v1/mcp HTTP/1.1
Host: lcpmqnkorcsclmpfbizr.supabase.co
Authorization: Bearer eyJhbGciOi...   # token OAuth do usuário
Content-Type: application/json
Accept: application/json, text/event-stream

{
  "jsonrpc": "2.0",
  "id": 42,
  "method": "tools/call",
  "params": {
    "name": "generate_caption",
    "arguments": {
      "brand_id": "b12...",
      "topic": "Lançamento da linha de verão",
      "platform": "instagram"
    }
  }
}
```

**Resposta (sucesso)**

```json
{
  "jsonrpc": "2.0",
  "id": 42,
  "result": {
    "content": [
      { "type": "text",
        "text": "🌞 A linha de verão chegou!\n\n<corpo>\n\nCTA\n\n#hashtag1 #hashtag2 ..." }
    ],
    "structuredContent": {
      "action_id": "a83...",
      "credits_used": 1,
      "credits_remaining": 1390
    }
  }
}
```

**Resposta (erro de créditos)**

```json
{
  "jsonrpc": "2.0", "id": 42,
  "result": {
    "isError": true,
    "content": [{ "type": "text",
      "text": "Créditos insuficientes: precisa de 8, saldo 3." }]
  }
}
```

**Resposta (não autenticado)**

```http
HTTP/1.1 401 Unauthorized
WWW-Authenticate: Bearer resource_metadata=".../.well-known/oauth-protected-resource"
```

---

## 6. Descoberta de tools (o que o agente "vê")

O agente chama uma vez `tools/list` e recebe o catálogo:

```json
{
  "tools": [
    {
      "name": "list_brands",
      "title": "Listar marcas",
      "description": "Retorna todas as marcas do usuário autenticado no workspace ativo.",
      "inputSchema": { "type": "object", "properties": {} },
      "annotations": { "readOnlyHint": true }
    },
    {
      "name": "generate_image",
      "title": "Gerar imagem",
      "description": "Gera uma imagem via Gemini a partir de uma marca e briefing. Custa ~8 créditos. Retorna a imagem crua; overlay de texto NÃO é aplicado neste canal.",
      "inputSchema": { "type": "object", "required": ["brand_id","description"], "properties": { ... } },
      "annotations": { "readOnlyHint": false, "destructiveHint": false }
    }
    // ...
  ]
}
```

`title`, `description` e `annotations` são o que o modelo lê para decidir se
chama a tool. Precisam ser específicos — é aqui que se avisa "custa créditos",
"não aplica overlay", "só admin", etc.

---

## 7. Resumo executivo — o que é viável hoje

| Categoria | Viabilidade | Comentário |
|---|---|---|
| Leitura de dados do usuário (marcas, personas, temas, histórico, créditos) | ✅ Totalmente | Baixo esforço, alto valor. |
| Escrita de metadados (categorias, favoritos, calendários, marcas) | ✅ Totalmente | Respeita RLS. |
| Geração textual (caption, review, plan) | ✅ Totalmente | Cabe no timeout, sem overlay envolvido. |
| Geração de imagem crua | ⚠️ Parcial | Entregue sem overlay de texto. |
| Geração de imagem com legenda queimada | ❌ Não hoje | Overlay é client-side (Canvas). |
| Geração de vídeo | ⚠️ Só assíncrono | Precisa 2 tools: start + poll. |
| Admin/sistema | ✅ Se `role='system'` | Rotas de logs, quota, receita. |
| Uploads binários grandes | ❌ Limitado | Sem multipart; só base64 pequeno ou URL. |
| Chat conversacional | ➖ Desnecessário | O agente já é o modelo. |

---

## 8. Segurança — o que **já está** protegido

- **RLS** em todas as tabelas relevantes (`brands`, `actions`,
  `credit_history`, `workspaces`, etc.) — o token OAuth do usuário é
  repassado, então o Postgres nega naturalmente qualquer acesso cruzado.
- **`has_role` / `requireSystemAdmin`** — tools admin só respondem para
  `admin@admin.com`.
- **Cobrança atômica** — `deductUserCredits` já protege contra "chamou 10
  vezes em paralelo".
- **Compliance** — `checkCompliance` roda antes/depois da geração, mesmo via
  MCP.
- **Sem `SUPABASE_SERVICE_ROLE_KEY`** dentro das tools do MCP — usar essa key
  atrás de um endpoint autenticado por token de usuário derrubaria toda a
  segurança do banco.
- **`mcp_audit_log`** já existe como tabela no schema — pronta para registrar
  cada chamada de tool (quem, quando, argumentos, resultado, custo).

---

## 9. Perguntas em aberto para você decidir

1. **Auth**: OAuth (recomendado) ou público? — Provável: OAuth.
2. **Escopo inicial**: começamos pequeno (só leitura + `generate_caption`) ou
   já expomos geração de imagem/vídeo?
3. **Workspace ativo**: cada tool recebe `workspace_id` explícito ou usa o
   workspace ativo do perfil?
4. **Overlay em imagem via MCP**: aceitar limitação e documentar, ou investir
   em renderização server-side dedicada só para esse canal?
5. **Vídeo**: expor agora (com padrão start+poll) ou deixar para depois?
6. **Auditoria**: registrar toda chamada em `mcp_audit_log` desde o dia 1
   (recomendado) ou só métricas agregadas?

---

**TL;DR** — Dá para transformar o Creator em um servidor MCP robusto e seguro
usando OAuth do Supabase. O que **não** dá para replicar hoje é a queima de
texto em imagem (que virou client-side por causa do CPU limit do Edge
Runtime); toda a lógica textual e de metadados é 100% viável e barata de
expor.
