# OAuth Setup - Creator AI

## Google Cloud Console Configuration

### Authorized JavaScript Origins
```
https://pla.creator.lefil.com.br
https://www.pla.creator.lefil.com.br
```

### Authorized Redirect URIs
```
https://pla.creator.lefil.com.br/~oauth/callback
https://www.pla.creator.lefil.com.br/~oauth/callback
```

> **Nota:** Se estiver em desenvolvimento/preview, adicione também as origens e URIs do ambiente de preview (ex: `https://id-preview--xxx.lovable.app`).

### Authorized Domains (OAuth Consent Screen)
```
creator.lefil.com.br
lovable.app (apenas se necessário para dev/preview)
```

---

## Backend Configuration (Lovable Cloud)

### Site URL
```
https://pla.creator.lefil.com.br
```

### Redirect URLs (Allow List)
```
https://pla.creator.lefil.com.br/**
https://www.pla.creator.lefil.com.br/**
```

---

## Arquitetura do Código

Todas as URLs de autenticação são centralizadas em `src/lib/auth-urls.ts`:

- `getAuthBaseUrl()` — retorna domínio canônico em produção, `window.location.origin` em dev
- `getOAuthRedirectUri()` — URL para `redirect_uri` do OAuth
- `getEmailRedirectUrl(path)` — URL completa para redirects de email
- `validateReturnUrl(url)` — previne open redirect, aceita apenas rotas internas

---

## Checklist de Validação Manual

1. [ ] Abrir `https://pla.creator.lefil.com.br` e clicar "Entrar com Google" — deve funcionar sem erro 400
2. [ ] Criar conta com Google na tela de registro — mesmo comportamento
3. [ ] Login com email/senha — deve continuar funcionando
4. [ ] Esqueceu a senha — link no email deve apontar para `pla.creator.lefil.com.br/reset-password`
5. [ ] Verificar no console do navegador que não há referências a `lovable.app` nos redirects OAuth em produção
6. [ ] Testar `?returnUrl=https://evil.com` — deve redirecionar para `/dashboard`

---

## Arquivos Modificados

| Arquivo | Alteração |
|---|---|
| `src/lib/auth-urls.ts` | **Novo** — utilitário central de URLs |
| `src/pages/Auth.tsx` | Usa `getOAuthRedirectUri()` e `getEmailRedirectUrl()` |
| `src/pages/Login.tsx` | Usa `getOAuthRedirectUri()` e `validateReturnUrl()` |
| `src/pages/Register.tsx` | Usa `getOAuthRedirectUri()`, `getEmailRedirectUrl()`, `getAuthBaseUrl()` |
| `src/pages/Subscribe.tsx` | Usa `getEmailRedirectUrl('/subscribe')` |
| `src/pages/Onboarding.tsx` | Usa `getEmailRedirectUrl('/dashboard')` |
| `src/hooks/useOAuthCallback.ts` | Usa `validateReturnUrl()` para redirect pós-OAuth |
| `supabase/functions/send-reset-password-email/index.ts` | Valida origin contra allowlist |
| `OAUTH_SETUP.md` | **Novo** — esta documentação |
