## Diagnóstico

O erro `Cannot read properties of undefined (reading 'getAuthorizationDetails')` na tela `/.lovable/oauth/consent` acontece porque o wrapper em `src/pages/OAuthConsent.tsx` faz:

```ts
const oauth = (supabase.auth as unknown as { oauth: {...} }).oauth;
```

e depois chama `oauth.getAuthorizationDetails(...)`. Em runtime, `supabase.auth.oauth` é `undefined`, então a chamada explode.

Causa raiz: a versão instalada de `@supabase/supabase-js` é `2.58.0`, que arrasta `@supabase/auth-js@2.72.0`. O namespace `supabase.auth.oauth` (com `getAuthorizationDetails`, `approveAuthorization`, `denyAuthorization`) só passou a existir em `@supabase/auth-js` a partir da linha 2.110.x. Verifiquei o pacote publicado 2.110.6 e ele já expõe `this.oauth = { getAuthorizationDetails, approveAuthorization, denyAuthorization }` no `GoTrueClient`.

Portanto o consent nunca vai funcionar com a versão atual — não é bug do fluxo, é dependência desatualizada. Também não adianta tentar chamar endpoints REST crus: o caminho oficial documentado (e recomendado pela knowledge do Lovable) é usar `supabase.auth.oauth`.

## Plano de correção

Mudança única e cirúrgica — só destrava o consent do OAuth server gerenciado, sem tocar em nenhuma outra lógica de auth, MCP, tools ou UI.

1. **Atualizar `@supabase/supabase-js`** de `^2.58.0` para `^2.110.6` em `package.json`. Isso puxa `@supabase/auth-js@2.110.6`, que já traz o namespace `supabase.auth.oauth`.
   - É uma minor bump dentro do major 2.x — API pública que o app já usa (`auth.getSession`, `auth.getUser`, `auth.signInWithPassword`, `auth.signInWithOAuth`, `from(...)`, `functions.invoke`, `channel`, etc.) permanece compatível.
   - O client gerado em `src/integrations/supabase/client.ts` não precisa ser editado (e não pode, é auto-gerado).

2. **Não alterar `src/pages/OAuthConsent.tsx`**. O wrapper tipado local já foi escrito exatamente com a forma dos métodos disponíveis em 2.110.x (`getAuthorizationDetails`, `approveAuthorization`, `denyAuthorization`). Depois do bump, `supabase.auth.oauth` existirá em runtime e as chamadas passam a resolver.

3. **Validar depois do bump**:
   - `npm install` roda automaticamente no sandbox.
   - Abrir o preview e confirmar que a página `/.lovable/oauth/consent?authorization_id=...` renderiza o card com nome do cliente + botões Aprovar/Recusar em vez do erro atual.
   - Rodar o fluxo real de conectar o MCP a partir do Marketing OS Shell (ou de qualquer cliente MCP) e verificar que o token OAuth chega até o `mcp` edge function e as tools de CRUD (marca/persona/tema) executam.

## Fora de escopo

- Não mudar `src/lib/mcp/**` (tools, issuer, deep-links) — o problema é 100% no front-end de consent, não no resource server.
- Não mudar `supabase/functions/mcp/index.ts` (é auto-gerado pelo `mcpPlugin`).
- Não mexer em `.env`, no client Supabase gerado, ou em rotas de auth (`/login`, `/register`) — o `next` já está preservado corretamente.
- Não adicionar novas tools nem tocar CRUD de personas/marcas/temas nesta rodada.

## Detalhe técnico (para referência)

- Versão atual instalada: `@supabase/supabase-js@2.58.0` → `@supabase/auth-js@2.72.0` (sem `oauth`).
- Versão alvo: `@supabase/supabase-js@^2.110.6` → `@supabase/auth-js@2.110.6` (com `oauth.getAuthorizationDetails`, `oauth.approveAuthorization`, `oauth.denyAuthorization` no `GoTrueClient`).
- Confirmado inspecionando o tarball publicado no npm: `package/dist/module/GoTrueClient.js` contém `this.oauth = { getAuthorizationDetails: this._getAuthorizationDetails.bind(this), approveAuthorization: this._approveAuthorization.bind(this), ... }`.
