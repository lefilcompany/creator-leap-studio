

## Correcao do Fluxo OAuth: Tratamento de Erros e Deploy

### Problema Identificado

Existem dois problemas distintos:

**1. Erro de callback OAuth nao tratado**
Apos o consentimento do Google, o callback retorna com `#error=server_error&error_description=failed%20to%20exchange%20authorization%20code` no hash. O hook `useOAuthCallback.ts` atualmente so verifica `access_token` e `code` -- ele ignora completamente erros no hash, fazendo o usuario voltar silenciosamente para a tela de login sem feedback.

**2. Timeout no deploy de edge functions**
O erro `Bundle generation timed out` e um problema transiente de infraestrutura, nao um problema de codigo. As edge functions precisam ser re-deployadas.

### O que sera alterado

**Arquivo: `src/hooks/useOAuthCallback.ts`**

Adicionar deteccao e tratamento de `#error=` no hash do callback:

- Antes de verificar `access_token` ou `code`, checar se o hash contem `error=`
- Se sim, extrair `error` e `error_description` do hash
- Exibir toast com mensagem clara para o usuario (ex: "Falha na autenticacao com Google")
- Logar detalhes tecnicos no console para diagnostico
- Limpar o hash da URL para evitar reprocessamento
- Nao marcar `isProcessing` como true nesse caso (permitir retry)

Melhorias adicionais:
- Logar o `window.location.origin` efetivo no callback para diagnostico
- Logar o hash completo (nao truncado) quando contem erro

**Edge Functions**

- Re-deploy de todas as edge functions para resolver o timeout transiente

### O que NAO sera alterado

- `src/lib/auth-urls.ts` -- ja esta correto e centralizado
- `src/pages/Auth.tsx`, `Login.tsx`, `Register.tsx` -- ja usam `getOAuthRedirectUri()` corretamente
- `src/integrations/lovable/index.ts` -- auto-gerado, nao pode ser modificado
- `supabase/functions/send-reset-password-email/index.ts` -- ja esta correto
- Fluxo de sessao, team selection, login/senha -- preservados

### Secao Tecnica

**Logica de deteccao de erro no hash:**

```text
hash = window.location.hash
if hash contains "error=" ->
  extrair error e error_description
  exibir toast com mensagem amigavel
  logar detalhes no console
  return (nao processar como sucesso)
if hash contains "access_token" -> fluxo implicit (existente)
if searchParams has "code" -> fluxo PKCE (existente)
```

**Mensagens de erro mapeadas:**

- `server_error` + `failed to exchange authorization code` -> "Falha ao trocar o codigo de autorizacao. Verifique se o redirect URI esta configurado corretamente no Google Cloud Console."
- `access_denied` -> "Acesso negado. Voce cancelou a autorizacao ou nao tem permissao."
- Outros -> Mensagem generica com o error_description original

**Sobre o erro `failed to exchange authorization code`:**

Este erro ocorre no servidor OAuth proxy do Lovable Cloud quando tenta trocar o authorization code com o Google. As causas mais comuns sao:
1. Redirect URI no Google Cloud Console nao inclui o callback correto
2. Client ID/Secret incorretos ou expirados
3. Problema transiente no servidor

O tratamento no frontend garante que o usuario veja uma mensagem clara em vez de ser silenciosamente redirecionado para o login.

### Checklist de validacao manual

1. Testar login com Google -- se funcionar, confirmar sessao no console (`[OAuth] Session obtained`)
2. Se o erro persistir, verificar no console a mensagem de erro detalhada com origin e error_description
3. Confirmar que o toast de erro aparece para o usuario em vez de falha silenciosa
4. Verificar no Google Cloud Console que o Redirect URI `https://pla.creator.lefil.com.br/~oauth/callback` esta registrado
5. Confirmar que o edge function `send-reset-password-email` esta deployada apos re-deploy

### Logs para verificar em caso de falha

- `[OAuth] Callback error detected in hash:` -- mostra o erro retornado pelo servidor OAuth
- `[OAuth] Callback check:` -- mostra origin, presenca de code/token/error
- `[OAuth] Session obtained:` -- confirma sessao valida apos sucesso

