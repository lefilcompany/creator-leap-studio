# Autenticação de teste no /mcp-docs

## Decisão: usuário real, token real

Token "falso" não faz sentido — o endpoint MCP (`/functions/v1/mcp`) valida a assinatura do JWT contra o JWKS do Supabase Auth. Qualquer coisa que não seja um JWT emitido pelo próprio Supabase é rejeitada com 401 antes de chegar em qualquer tool.

Portanto o painel vai fazer **login real** via `supabase.auth.signInWithPassword(email, senha)` e usar o `access_token` retornado. Vantagens: RLS aplicada como o usuário real, `get_profile`/`list_brands`/etc. retornam dados reais dele, e nada é "mock" — o teste reflete o comportamento de produção.

### Ajuste necessário no MCP para aceitar esse token

Hoje `src/lib/mcp/index.ts` usa `auth.oauth.issuer(...)` com o default `requireOAuthClientClaim: true`. Esse default **rejeita tokens de sessão do app** (signInWithPassword não carrega `client_id`) e só aceita tokens vindos do fluxo OAuth 2.1 com consent. Para o painel de teste funcionar sem forçar o fluxo de consent, vamos definir explicitamente:

```ts
auth: auth.oauth.issuer({
  issuer: resolveOauthIssuer(),
  acceptedAudiences: "authenticated",
  requireOAuthClientClaim: false, // aceita sessão do próprio app para testes
}),
```

Tradeoff assumido: qualquer sessão válida de usuário do Creator consegue chamar o MCP (ainda limitada por RLS — o usuário só vê os dados dele). Isso é aceitável porque o MCP não expõe nada além do que a UI do Creator já expõe ao mesmo usuário logado. A proteção real dos dados continua sendo RLS + as regras de team, não o `client_id` do token.

Após a mudança é necessário redeployar a função `mcp` (o plugin regenera `supabase/functions/mcp/index.ts` e a edge precisa subir de novo).

## O que aparece na página

Novo bloco fixo no topo da coluna de detalhes de `/mcp-docs`, acima do playground:

- Título: **Gerar token de teste**
- Campos: **E-mail** e **Senha** (input `type=password`).
- Botão **Entrar** → chama `supabase.auth.signInWithPassword`.
- Em caso de sucesso:
  - Mostra `Autenticado como <nome> (<email>)`, com botão **Sair**.
  - Exibe o `access_token` mascarado + botão **Copiar** + prazo de expiração (`expires_at`).
  - Preenche automaticamente o campo `Access token (Bearer)` do `ToolPlayground` via um contexto React leve (`McpAuthContext`) — sem precisar colar manualmente.
- Em caso de erro: mensagem inline curta ("E-mail ou senha inválidos").
- Aviso permanente: "Este token é da sua sessão real. Não compartilhe. Use apenas para testes."

Nada é persistido além do próprio storage padrão do Supabase (já usado no app).

## Ferramentas que **não** podem ser testadas

Regra: qualquer tool com `costCredits && costCredits > 0` no `mcpToolsCatalog.ts` é bloqueada no playground. Hoje isso cobre:

- `create_image_content`
- `create_quick_content`
- `generate_caption`
- `create_content_plan`
- `review_image`
- `review_caption`
- `review_text_for_image`

Nessas telas o `ToolPlayground` é substituído por um card informativo:

> **Teste desabilitado**
> Esta ferramenta consome N crédito(s) reais da conta autenticada. Para evitar débitos indevidos, o playground do /mcp-docs não executa chamadas que gastem crédito. Use um cliente MCP conectado (Claude, ChatGPT, etc.) se quiser rodar em ambiente real.

Todas as demais (echo, get_profile, get_credit_balance, list/get de marcas/personas/temas, list_calendars, list_calendar_items, list_actions, get_action e os `create_*`/`update_*` de contexto sem custo) permanecem executáveis.

## Detalhes técnicos

1. **`src/lib/mcp/index.ts`** — adicionar `requireOAuthClientClaim: false` no `auth.oauth.issuer`.
2. **Redeploy** da edge `mcp` após a mudança acima.
3. **`src/contexts/McpAuthContext.tsx`** (novo) — provider simples com `{ session, token, signIn, signOut }` usando `supabase.auth.signInWithPassword` em memória; NÃO altera nem observa a sessão global do app (usa um `createClient` isolado com `persistSession: false, storageKey: "mcp-docs-test"`), para não deslogar o usuário logado no Creator.
4. **`src/components/mcp-docs/AuthPanel.tsx`** (novo) — UI descrita acima.
5. **`src/components/mcp-docs/ToolPlayground.tsx`** — passar a ler o token do `useMcpAuth()` (mantendo o campo manual como fallback editável) e desabilitar a execução quando `tool.costCredits && tool.costCredits > 0`, renderizando o card informativo no lugar dos botões.
6. **`src/pages/McpDocs.tsx`** — envelopar o conteúdo em `<McpAuthProvider>` e montar o `AuthPanel` no topo do detalhe da tool selecionada.

Sem mudanças no catálogo de tools, no OAuth de produção, nas rotas ou em qualquer outra área do app.
