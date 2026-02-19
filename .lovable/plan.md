

## Refatoracao do Fluxo OAuth para Dominio Proprio

### Resumo

Centralizar todas as URLs de autenticacao (OAuth Google, signup email redirect, reset password) em um unico utilitario `src/lib/auth-urls.ts`, eliminando o uso direto de `window.location.origin` e garantindo que em producao apenas `https://pla.creator.lefil.com.br` seja usado.

### O que sera criado

**1. Novo arquivo: `src/lib/auth-urls.ts`**

Utilitario central com:
- `getAuthBaseUrl()`: retorna `https://pla.creator.lefil.com.br` em producao (detectado via hostname), ou `window.location.origin` em desenvolvimento/preview
- `getOAuthRedirectUri()`: retorna a base URL para o `redirect_uri` do OAuth
- `getEmailRedirectUrl(path)`: retorna URL completa para redirects de email (signup, reset)
- `validateReturnUrl(url)`: valida que returnUrl e uma rota interna (comeca com `/`, sem `//`, sem dominio externo) - previne open redirect
- Lista de dominios permitidos como constante
- Logs de warning quando dominio detectado nao esta na lista permitida

### O que sera modificado

**2. `src/pages/Auth.tsx`** (arquivo principal de login/registro)
- Importar `getAuthBaseUrl`, `getOAuthRedirectUri`, `getEmailRedirectUrl` de `auth-urls.ts`
- `handleGoogleSignIn`: trocar `window.location.origin` por `getOAuthRedirectUri()`
- `handleRegister` (`emailRedirectTo`): trocar por `getEmailRedirectUrl('/dashboard')`
- Adicionar log de erro claro para falhas OAuth com mensagem sobre `redirect_uri_mismatch`

**3. `src/pages/Login.tsx`**
- Importar utilitario
- `handleGoogleLogin`: trocar `window.location.origin` por `getOAuthRedirectUri()`
- Melhorar log de erro OAuth

**4. `src/pages/Register.tsx`**
- Importar utilitario
- `handleGoogleSignup`: trocar `window.location.origin` por `getOAuthRedirectUri()`
- `handleRegister` (`emailRedirectTo`): trocar por `getEmailRedirectUrl('/dashboard')`
- Facebook OAuth: trocar `window.location.origin` por `getAuthBaseUrl()`

**5. `src/pages/Subscribe.tsx`**
- `emailRedirectTo`: trocar por `getEmailRedirectUrl('/subscribe')`

**6. `src/pages/Onboarding.tsx`**
- `emailRedirectTo`: trocar por `getEmailRedirectUrl('/dashboard')`

**7. `src/hooks/useOAuthCallback.ts`**
- Importar `validateReturnUrl` de `auth-urls.ts`
- Aplicar validacao de returnUrl antes de redirecionar
- Adicionar logs claros para erros de callback OAuth

**8. `supabase/functions/send-reset-password-email/index.ts`**
- Adicionar lista de dominios permitidos no servidor
- Validar que o `origin` detectado esta na lista antes de usar
- Se nao estiver, usar fallback `https://pla.creator.lefil.com.br`

### O que NAO sera alterado

- `src/integrations/lovable/index.ts` - arquivo auto-gerado, nao pode ser modificado
- `src/integrations/supabase/client.ts` - arquivo auto-gerado
- Fluxo de sessao, onboarding e team selection - preservados integralmente
- Login/senha tradicional - nenhuma alteracao

### Documentacao

**9. Novo arquivo: `OAUTH_SETUP.md`**

Documentacao com:
- URLs que devem existir no Google Cloud Console (origens JS + redirect URIs)
- URLs que devem estar no backend (Site URL + allow list)
- Como testar em producao
- Checklist de validacao manual

---

### Secao Tecnica

**Logica do `getAuthBaseUrl()`:**
```text
if hostname contains "pla.creator.lefil.com.br" -> return "https://pla.creator.lefil.com.br"
if hostname contains "www.pla.creator.lefil.com.br" -> return "https://pla.creator.lefil.com.br" (canonical sem www)
else -> return window.location.origin (dev/preview)
```

**Logica do `validateReturnUrl(url)`:**
```text
if url is null/empty -> return "/dashboard"
if url starts with "//" or contains "://" -> return "/dashboard"
if url does not start with "/" -> return "/dashboard"
return url
```

**Arquivos modificados (total: 8)**
1. `src/lib/auth-urls.ts` (novo)
2. `src/pages/Auth.tsx`
3. `src/pages/Login.tsx`
4. `src/pages/Register.tsx`
5. `src/pages/Subscribe.tsx`
6. `src/pages/Onboarding.tsx`
7. `src/hooks/useOAuthCallback.ts`
8. `supabase/functions/send-reset-password-email/index.ts`
9. `OAUTH_SETUP.md` (novo)

**Checklist de validacao manual:**
1. Abrir `https://pla.creator.lefil.com.br` e clicar "Entrar com Google" - deve redirecionar e voltar sem erro 400
2. Criar conta com Google na tela de registro - mesmo comportamento
3. Login com email/senha - deve continuar funcionando normalmente
4. Esqueceu a senha - link no email deve apontar para `pla.creator.lefil.com.br/reset-password`
5. Verificar no console do navegador que nao ha referencias a `lovable.app` nos redirects OAuth
6. Tentar manipular returnUrl com URL externa (ex: `?returnUrl=https://evil.com`) - deve cair no `/dashboard`

