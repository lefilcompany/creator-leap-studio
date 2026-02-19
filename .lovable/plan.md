

## Correção: Erro 400 redirect_uri_mismatch no domínio creator-v4.lovable.app

### Problema

O Google OAuth está rejeitando a requisição com erro 400 porque a URL `https://creator-v4.lovable.app/~oauth/callback` não está registrada como URI de redirecionamento autorizada.

### Causa

Na configuração de URLs permitidas (URL Allow List) do backend, foram adicionadas apenas as URLs do domínio customizado (`pla.creator.lefil.com.br`). O domínio publicado padrão (`creator-v4.lovable.app`) também precisa estar na lista.

### Solução (Configuracao no Backend - sem alteracao de codigo)

1. Abra o backend do Lovable Cloud
2. Vá em **Users** -> **Authentication Settings**
3. Na secao **Redirect URLs** (URL Allow List), adicione:
   - `https://creator-v4.lovable.app`
   - `https://creator-v4.lovable.app/**`
4. Certifique-se de que as URLs existentes do dominio customizado permanecem:
   - `https://pla.creator.lefil.com.br`
   - `https://pla.creator.lefil.com.br/**`
5. Salve as alteracoes

### Nao ha alteracoes de codigo necessarias

O codigo em `Auth.tsx` ja esta correto:
```typescript
const { error } = await lovable.auth.signInWithOAuth("google", {
  redirect_uri: window.location.origin,
  extraParams: { prompt: "select_account" },
});
```

O `window.location.origin` resolve dinamicamente para o dominio correto (seja `creator-v4.lovable.app` ou `pla.creator.lefil.com.br`). O problema e exclusivamente de configuracao no backend.

### Secao Tecnica

O fluxo OAuth do Google funciona assim:
1. Usuario clica "Entrar com Google"
2. O codigo envia `redirect_uri: window.location.origin` (ex: `https://creator-v4.lovable.app`)
3. A biblioteca `@lovable.dev/cloud-auth-js` adiciona `/~oauth/callback` ao final, formando `https://creator-v4.lovable.app/~oauth/callback`
4. O Google verifica se essa URI esta autorizada nas configuracoes OAuth
5. Se nao estiver na lista, retorna erro 400 `redirect_uri_mismatch`

Ao adicionar ambos os dominios na lista de URLs permitidas, o login com Google funcionara tanto no dominio padrao quanto no customizado.

