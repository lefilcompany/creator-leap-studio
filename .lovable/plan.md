# Igualar o padrão de código do MCP ao LEKPIS V3

Objetivo: deixar `src/lib/mcp/index.ts`, `src/lib/mcp/tools/echo.ts` e `vite.config.ts` visualmente/estruturalmente idênticos ao LEKPIS V3. **Nenhuma ferramenta é criada, removida ou renomeada.** As 29 ferramentas atuais e a estrutura de pastas (`brands/`, `personas/`, `themes/`, `content/`, `review/`, `context/`, `_shared/`) permanecem intactas.

## Diferenças detectadas hoje vs. LEKPIS

1. `src/lib/mcp/tools/echo.ts` — LEKPIS retorna `structuredContent` com `echoed`, `authenticated`, `userId`, `timestamp` e usa `title: "LeKPIs — Echo"` + descrição longa. O Creator tem uma versão minimalista que só devolve o texto.
2. `src/lib/mcp/index.ts` — LEKPIS usa comentário curto ("Build-time literal — keeps the entry import-safe…") acima do `projectRef`. O Creator usa um comentário em PT diferente. Ordem de imports e formatação do array `tools` também diferem.
3. `vite.config.ts` — LEKPIS tem `dedupe: ["react", "react-dom", "react/jsx-runtime"]` e não usa `optimizeDeps`. O Creator tem `dedupe: ["react", "react-dom"]` + `optimizeDeps.include`.

## Mudanças propostas

### 1. `src/lib/mcp/tools/echo.ts`
Reescrever igual ao LEKPIS, adaptando só o título para o produto:
- `title: "Creator — Echo"`
- descrição longa explicando que serve para verificar fluxo de argumentos e OAuth
- handler recebendo `(text, ctx)` e retornando `structuredContent` com `echoed`, `authenticated`, `userId`, `timestamp`
- annotations `readOnlyHint`, `idempotentHint`, `openWorldHint: false` (já iguais)

### 2. `src/lib/mcp/index.ts`
Reformatar mantendo TODOS os 29 imports e todas as entradas do array `tools`:
- Ajustar o comentário acima do `projectRef` para o texto do LEKPIS ("Build-time literal — keeps the entry import-safe (no runtime env reads at eval).")
- Manter `name: "creator-mcp"`, `title: "Creator MCP"`, `version: "1.0.0"` e o mesmo bloco `auth: auth.oauth.issuer({...})`
- Manter as `instructions` atuais do Creator (elas descrevem o produto — trocar por texto do LEKPIS quebraria a UX do agente)
- Manter a organização de imports por categoria (marcas, personas, temas, criação, revisão, contexto) — só é reformatação cosmética se necessário para bater com o estilo do LEKPIS

### 3. `vite.config.ts`
- Trocar `dedupe: ["react", "react-dom"]` por `dedupe: ["react", "react-dom", "react/jsx-runtime"]`
- Remover o bloco `optimizeDeps: { include: ["react", "react-dom"] }` (o LEKPIS não usa)
- Manter `mcpPlugin()` já presente

## O que NÃO muda

- Nenhuma ferramenta é apagada, renomeada ou movida.
- `_shared/`, `brands/`, `personas/`, `themes/`, `content/`, `review/`, `context/`, `get-profile.ts`, `list-brands.ts` — todos intactos.
- `supabase/functions/mcp/index.ts` continua sendo gerado pelo `mcpPlugin()` no build.
- Nenhuma mudança em auth, DB, RLS ou secrets.

## Pós-implementação

- Rodar `app_mcp_server--extract_mcp_manifest` para revalidar o manifest (a mudança em `echo.ts` altera título/descrição).
- Deploy da função `mcp` via `supabase--deploy_edge_functions` para propagar o novo `echo` para clientes conectados.
- O 401 discutido nos turnos anteriores **não é resolvido por essa mudança** — é uma decisão de autorização dentro da edge function; segue como issue separado.
