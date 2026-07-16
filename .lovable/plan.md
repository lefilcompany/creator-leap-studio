## Diagnóstico

- `.env` deste repositório aponta para o projeto **Test** `lcpmqnkorcsclmpfbizr` (`VITE_SUPABASE_PROJECT_ID`).
- A função `mcp` publicada está no projeto **Live** `afxwqkrneraatgovhpkb`, mas foi buildada com o `VITE_SUPABASE_PROJECT_ID` do Test.
- Resultado: `/.well-known/oauth-protected-resource` anuncia `authorization_servers: ["https://lcpmqnkorcsclmpfbizr.supabase.co/auth/v1"]`, enquanto o app Creator (pla.creator.lefil.com.br) e a tela de consent falam com `afxwqkrneraatgovhpkb.supabase.co`. O cliente MCP pede token no issuer errado e o consent nunca casa com a autorização.

Alvo canônico: **usar sempre o projeto Supabase onde a função MCP está rodando** (o mesmo que autentica os usuários do app). No caso do Creator publicado isso é `afxwqkrneraatgovhpkb.supabase.co`.

## Correções

### 1. `src/lib/mcp/index.ts` — derivar o issuer em runtime do próprio edge
Substituir o `projectRef` vindo de `import.meta.env.VITE_SUPABASE_PROJECT_ID` (literal de build, sempre o Test) por uma leitura em runtime dentro da edge function, com fallback seguro no eval do extractor de manifesto:

```ts
function resolveOauthIssuer(): string {
  // Runtime (edge): SUPABASE_URL é o projeto real onde a função roda.
  const runtimeUrl =
    typeof process !== "undefined" ? process.env?.SUPABASE_URL : undefined;
  if (runtimeUrl) {
    // Normaliza .lovable.cloud -> issuer direto <ref>.supabase.co/auth/v1
    const ref = new URL(runtimeUrl).hostname.split(".")[0];
    return `https://${ref}.supabase.co/auth/v1`;
  }
  // Build-time / manifest-extract fallback (não usado para verificar tokens reais)
  const buildRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";
  return `https://${buildRef}.supabase.co/auth/v1`;
}

auth: auth.oauth.issuer({
  issuer: resolveOauthIssuer(),
  acceptedAudiences: "authenticated",
}),
```

Efeito: a função publicada em `afxwqkrneraatgovhpkb` passa a anunciar e verificar tokens contra `https://afxwqkrneraatgovhpkb.supabase.co/auth/v1`, sem depender de qual `.env` foi usado no build.

### 2. Redeploy da função `mcp` no projeto Live
- `supabase--deploy_edge_functions` com `["mcp"]` para propagar a alteração.
- Depois validar via curl:
  - `GET https://afxwqkrneraatgovhpkb.supabase.co/functions/v1/mcp/.well-known/oauth-protected-resource` deve trazer `authorization_servers` com o issuer `afxwqkrneraatgovhpkb.supabase.co/auth/v1`.
  - `GET https://afxwqkrneraatgovhpkb.supabase.co/auth/v1/.well-known/openid-configuration` deve reportar o mesmo `issuer`.

### 3. Ativar/validar OAuth 2.1 no projeto Live
- Rodar `supabase--configure_oauth_server` **com `environment: production`** para garantir DCR + consent path no projeto correto (`afxwqkrneraatgovhpkb`).
- Rodar `supabase--debug_oauth_server` para confirmar Site URL = `https://pla.creator.lefil.com.br`, consent = `/.lovable/oauth/consent`, e que existem chaves assimétricas no JWKS. Se JWKS estiver vazio, rodar `supabase--migrate_signing_keys` com `environment: production`.

### 4. Consent route (`src/pages/OAuthConsent.tsx`)
- Já usa o cliente Supabase do app (mesmo projeto que emitiu a autorização), então nenhuma mudança de código é necessária.
- Melhorar a mensagem quando `getAuthorizationDetails` retorna `authorization not found`: mostrar "Esta solicitação de autorização expirou ou não existe mais. Volte ao cliente e tente conectar novamente." em vez do erro cru.

### 5. Preservar `next` no login (bug do print)
- Confirmar que `Auth.tsx` (rota `/login`) prioriza `?next=/.lovable/oauth/consent?...` antes de redirecionar para `/dashboard` ou `/system` — já está implementado; sem mudança adicional, exceto se aparecer regressão.

## Fora do escopo
- Não trocar quais tools o MCP expõe.
- Não mexer em RLS, tabelas, ou provisionamento de usuários.
- Não trocar o app do Creator para o projeto `lcpmqnkorcsclmpfbizr`; a direção certa é alinhar o MCP ao projeto que já autentica os usuários.

## Critério de sucesso
- Cliente MCP (ChatGPT/Claude) descobre issuer `afxwqkrneraatgovhpkb.supabase.co`, faz DCR, é redirecionado ao consent do Creator, o usuário aprova, recebe token válido e as tools passam a responder autenticadas.