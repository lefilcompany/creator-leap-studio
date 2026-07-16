# Corrigir 401 do MCP Creator — migração para chaves assimétricas

## Causa raiz (confirmada nos logs de `mcp`)

A edge function do Creator está rejeitando os tokens com:

```
JOSEAlgNotAllowed: "alg" (Algorithm) Header Parameter value not allowed
oauth.verify.start ... jwtAlg: "HS256", jwtKid: "M5GNu73DXe437VQ5"
outcome: 401 invalid_token
```

O access token OAuth emitido pelo Supabase Auth do Creator ainda está sendo assinado com **HS256** (segredo simétrico do sistema legado). O verificador do `@lovable.dev/mcp-js` só aceita chaves assimétricas publicadas em JWKS (RSA/EC/OKP), conforme a RFC 8414 / OAuth 2.1. Por isso todo `tools/list` cai em 401 — não é problema de escopo, provisionamento, DCR, refresh token nem do Marketing OS. O JWKS `https://lcpmqnkorcsclmpfbizr.supabase.co/auth/v1/.well-known/jwks.json` provavelmente está vazio (ou só simétrico), e é o que precisa ser corrigido.

## Correção

Executar a migração do Supabase Auth para o novo sistema de **assinaturas assimétricas (signing keys)**. Isso faz o Supabase passar a emitir JWTs `RS256/ES256`, publicar a chave pública no JWKS, e o `mcp-js` passa a verificar com sucesso.

### Passos (build mode)

1. Rodar `supabase--migrate_signing_keys` no projeto Creator.
2. Verificar `curl $ISSUER/.well-known/jwks.json` — precisa aparecer ao menos uma chave com `kty: RSA` ou `EC` (não vazio, não só HS).
3. Pedir para o Marketing OS reconectar o Creator em Configurações → MCP (o access token atual, HS256, precisa ser trocado por um novo emitido já com a chave nova).
4. Confirmar nos logs de `mcp` que aparece `oauth.verify.start ... jwtAlg: "RS256"` (ou EC) e não mais `JOSEAlgNotAllowed`, e que o `tools/list` responde 200 com as 29 ferramentas.

### O que NÃO mexer

- `src/lib/mcp/index.ts`, tools, `supabase/functions/mcp/index.ts`, manifest — estão corretos.
- Nada na UI ou no Marketing OS.
- Consent route, DCR, escopos — sem alteração.

## Impacto

A migração de signing keys afeta **todos** os JWTs do projeto (não só MCP): sessões de usuários logados no app Creator serão invalidadas gradualmente conforme os refresh tokens rodam, e clients server-side que hardcoded o `JWT_SECRET` simétrico param de validar tokens novos. No Creator os edge functions usam `getUser()`/`getClaims()` via SDK, que resolvem sozinhos via JWKS — sem alteração de código esperada. Usuários no app podem precisar refazer login uma vez.

## Rollback

`supabase--migrate_signing_keys` é reversível pelo próprio Supabase (rotação/rollback de key). Caso algo quebre, revertemos a chave e reconectamos o MCP.
