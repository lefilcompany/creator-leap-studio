# MCP Creator — Configuração Completa

Objetivo: expor via MCP as funcionalidades essenciais do Creator para que o "Marketing OS" (outro projeto Lovable) consiga executar o roteiro conversacional do Anexo D — desde verificar/criar marca, ler personas e temas, até gerar e revisar conteúdo.

Base atual: já existem `echo`, `get_profile`, `list_brands` em `src/lib/mcp/tools/`, OAuth ativo em `https://<ref>.supabase.co/auth/v1`, consent em `/.lovable/oauth/consent`. Vamos expandir sobre essa base.

## Ferramentas MCP a criar

Todas usam o token OAuth do usuário (`ctx.getToken()`) e respeitam RLS. Nomes, títulos e descrições ficam em português curto — é o que o Marketing OS vai ler para escolher a tool.

### Marcas (CRUD)
- `list_brands` (já existe — manter)
- `get_brand` — lê marca por id, retorna campos completos (identidade visual, valores, restrições, etc.)
- `create_brand` — cadastra marca nova. Inputs alinhados ao formulário de cadastro do roteiro (nome, segmento, valores, palavras-chave, indicadores, referências, datas importantes, links, restrições, logo_url). Obrigatórios: name, segment, values, success_indicators, restrictions, logo_url.
- `update_brand` — atualiza campos parciais de uma marca existente
- `delete_brand` — soft delete (`deleted_at`)

### Personas (CRUD)
- `list_personas` — lista personas do usuário/equipe, filtro opcional `brand_id`
- `get_persona` — detalhes completos
- `create_persona` — cria persona (nome, faixa etária, descrição, dores, desejos, brand_id opcional)
- `update_persona` — atualização parcial
- `delete_persona` — soft delete

### Temas Estratégicos / Editorias (CRUD)
- `list_themes` — lista temas, filtro opcional `brand_id`
- `get_theme` — detalhes
- `create_theme` — cria tema (nome, descrição, narrativa, brand_id)
- `update_theme` — atualização parcial
- `delete_theme` — soft delete

### Criação de conteúdo
- `create_image_content` — dispara pipeline completo de geração de imagem invocando a edge function `generate-image`. Inputs: brand_id (obrigatório), persona_id, theme_id, narrative, tone_of_voice[] (até 4), platform, format/aspect_ratio, has_text_on_image, scene_description opcional, campaign_context opcional. Retorna action_id + URL da imagem.
- `create_quick_content` — versão simplificada usando `generate-quick-content` (fluxo rápido do Creator)
- `generate_caption` — chama `generate-caption` para produzir legenda a partir de uma imagem/contexto
- `create_content_plan` — chama `generate-plan` para calendário de conteúdo (inputs: brand_id, período, plataformas, objetivo, campanha opcional)

### Revisão de conteúdo
- `review_image` — chama `review-image` (aceita image_url + instruções de ajuste)
- `review_caption` — chama `review-caption` (texto + instruções)
- `review_text_for_image` — chama `review-text-for-image`

### Utilitários de contexto
- `get_profile` (já existe — manter)
- `get_credit_balance` — retorna créditos do usuário (leitura de `profiles.credits`)
- `list_calendars` — lista `content_calendars` do usuário
- `list_calendar_items` — itens de um calendário
- `list_actions` — lista peças criadas (histórico), filtros por brand_id/status
- `get_action` — detalhes de uma action pelo id

Total: ~24 tools organizadas em 5 grupos.

## Estrutura de arquivos

```text
src/lib/mcp/
├── index.ts                    # defineMcp com todas as tools importadas
├── _shared/
│   └── supabase.ts             # helper supabaseForUser(ctx) reaproveitado
└── tools/
    ├── echo.ts
    ├── brands/                 # list, get, create, update, delete
    ├── personas/
    ├── themes/
    ├── content/                # create-image, quick, caption, plan
    ├── review/                 # image, caption, text-for-image
    └── context/                # profile, credits, calendars, actions
```

Cada tool: um arquivo, um `defineTool` default-exportado, `inputSchema` em Zod, `annotations` corretas (readOnlyHint para leituras; destructiveHint para deletes), descrição de uma frase em pt-BR.

## Segurança e RLS

- Todas as tools que gravam usam `ctx.getUserId()` — nunca aceitam `user_id` como input.
- Todas as consultas usam cliente Supabase com `Authorization: Bearer ${ctx.getToken()}`, então RLS existente (marcas, personas, temas, actions) já aplica.
- Tools de criação/revisão que hoje descontam créditos via edge function continuam descontando normalmente — a edge function já valida saldo.
- Delete é sempre soft delete (`deleted_at`) seguindo o padrão do projeto.

## Documentação

- `docs/MCP_CREATOR.md` novo, cobrindo:
  - Lista de tools com descrição, inputs, outputs, exemplos JSON
  - Mapeamento pergunta do roteiro → tool MCP (tabela do Anexo D)
  - Fluxo típico do Marketing OS: `list_brands` → (se não existe) `create_brand` → `list_personas` → `list_themes` → `create_image_content` → `generate_caption`
  - Como conectar (URL do endpoint, OAuth flow, DCR)
  - Limitações conhecidas: geração de vídeo continua no app (long-running), abertura de questões no Discourse não faz parte deste MCP

## Passos de execução

1. Criar `_shared/supabase.ts` (helper import-safe: lê env dentro do handler, não no top level).
2. Criar as 24 tools em paralelo, agrupadas por pasta.
3. Atualizar `src/lib/mcp/index.ts` importando e listando todas.
4. Rodar `app_mcp_server--extract_mcp_manifest` para regenerar o manifest e capturar erros.
5. Deploy: `supabase--deploy_edge_functions(["mcp"])`.
6. Escrever `docs/MCP_CREATOR.md`.
7. Sugerir publish no final para o Marketing OS enxergar as novas tools.

## Detalhes técnicos importantes

- Handlers de criação de imagem/vídeo/caption **invocam edge functions existentes** via `supabase.functions.invoke(name, { body })` com o token do usuário. Não duplicam lógica de geração — apenas fazem o pedido e devolvem o resultado.
- Handlers devem retornar rápido. Geração de imagem no Creator hoje leva ~15-30s; fica no limite do timeout MCP mas é o padrão que já funciona no app. Se houver risco de estouro, documentar como limitação e recomendar polling via `get_action`.
- `create_content_plan` (calendário) pode ser longo — devolver o `calendar_id` imediatamente e deixar o Marketing OS consultar via `list_calendar_items` quando quiser.
- Zod schemas usam `.describe()` em todos os campos: essa string aparece para o Marketing OS na hora de escolher os inputs.

## Fora do escopo (agora)

- Geração de vídeo síncrona via MCP (usa `generate-video`, é assíncrona e demorada — mantém no app).
- Abertura de tópicos no Discourse (não faz parte deste projeto).
- Upload de logo/imagem via MCP — o Marketing OS deve enviar uma URL pública; upload direto de bytes fica para uma segunda iteração.
