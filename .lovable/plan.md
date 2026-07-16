# Remoção completa do MCP

Objetivo: deixar o projeto sem nenhum vestígio do servidor MCP e do fluxo OAuth associado a ele, para reconstruir do zero em seguida. **Nenhuma edge function existente será apagada** (apenas a função `mcp` gerada automaticamente pelo plugin). Nada de créditos, marcas, personas, ações, auth do app etc. será alterado.

## O que será removido

**Código-fonte do MCP (`src/lib/mcp/`)**
- Apagar diretório inteiro: `index.ts`, `authUser.ts`, `deepLink.ts`, `supabaseClient.ts` e a pasta `tools/` (com todas as 24 tools).

**Plugin no build**
- `vite.config.ts`: remover o import `mcpPlugin` de `@lovable.dev/mcp-js/stacks/supabase/vite` e a entrada `mcpPlugin()` do array `plugins`.

**Dependência npm**
- Remover `@lovable.dev/mcp-js` do `package.json`.

**Página de consentimento OAuth (existe só para o MCP)**
- Apagar `src/pages/OAuthConsent.tsx`.
- `src/App.tsx`: remover o `lazy import` de `OAuthConsent` (linha 32) e a `<Route path="/.lovable/oauth/consent" ...>` (linha 138).

**Edge function gerada pelo plugin**
- Apagar `supabase/functions/mcp/` (arquivo `index.ts` auto-gerado) via `rm` no shell.
- Rodar `supabase--delete_edge_functions` para remover a função `mcp` já deployada em Test e Production, para o endpoint `/functions/v1/mcp` deixar de responder.

**Manifesto e docs internas do MCP**
- Apagar `.lovable/mcp/manifest.json` (e a pasta `.lovable/mcp/` se ficar vazia).
- Apagar `docs/MCP_POSSIBILIDADES.md`.
- `OAUTH_SETUP.md` foi criado para o MCP: revisar e apagar se descrever apenas o fluxo OAuth do MCP.

## O que NÃO será tocado

- Todas as demais edge functions em `supabase/functions/` (compliance, geração de imagem, Stripe, RD Station, etc.).
- Tabelas, RLS, migrations, secrets do banco.
- `AuthContext`, login/registro, Google OAuth do app (usado para o login normal, não é do MCP).
- Hooks, componentes, páginas de negócio (marcas, personas, temas, actions, calendário, etc.).
- Configuração de OAuth server do Supabase — o Supabase mantém a configuração ativa mesmo sem MCP; ela pode ser reutilizada quando reconstruirmos. Se você preferir também desativar, me avise e eu incluo no plano.

## Ordem de execução

1. Editar `vite.config.ts` (retirar o plugin).
2. Editar `src/App.tsx` (retirar import + rota do consent).
3. Apagar `src/pages/OAuthConsent.tsx`.
4. Apagar `src/lib/mcp/` inteiro.
5. Apagar `supabase/functions/mcp/` e chamar `supabase--delete_edge_functions` para `mcp`.
6. Apagar `.lovable/mcp/manifest.json`, `docs/MCP_POSSIBILIDADES.md`, `OAUTH_SETUP.md` (se for só do MCP).
7. Remover `@lovable.dev/mcp-js` do `package.json` via `bun remove`.
8. Rodar typecheck para garantir que nada mais referencia MCP.

## Verificação final

- `rg -n "mcp|OAuthConsent|@lovable.dev/mcp-js"` no repositório não deve retornar nada em código do app (apenas eventualmente em memórias/knowledge, o que é esperado).
- Build passa.
- Endpoint `https://<ref>.supabase.co/functions/v1/mcp` retorna 404 após o delete.

Confirma que posso prosseguir com essa remoção?
