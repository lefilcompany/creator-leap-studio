
# Plano: Atualizar a Edge Function para Resetar Senha por ID

## Problema Identificado
A edge function `reset-user-password` usa `listUsers()` que retorna apenas os primeiros 50 usuários por padrão. Com muitos usuários no sistema, o usuário pode não ser encontrado na primeira página de resultados.

## Solução
Atualizar a edge function para aceitar também o `userId` diretamente, permitindo usar `updateUserById` sem precisar buscar todos os usuários.

## Mudanças Técnicas

### 1. Atualizar a Edge Function (`supabase/functions/reset-user-password/index.ts`)
- Aceitar `userId` como parâmetro opcional além do `email`
- Se `userId` for fornecido, usar diretamente `updateUserById`
- Se apenas `email` for fornecido, buscar o usuário primeiro

```typescript
const { email, newPassword, userId } = await req.json()

if (!newPassword) {
  throw new Error('newPassword is required')
}

if (!email && !userId) {
  throw new Error('email or userId is required')
}

let targetUserId = userId

// Se não tiver userId, buscar pelo email
if (!targetUserId && email) {
  const { data: { users }, error: getUserError } = await supabaseAdmin.auth.admin.listUsers({
    filter: {
      email: email
    }
  })
  // ... buscar usuário
}

// Atualizar senha diretamente pelo ID
const { data, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
  targetUserId,
  { password: newPassword }
)
```

## Após a Implementação
Será possível chamar a função assim:
```json
{
  "userId": "ea7a6020-f9cf-4514-9272-a5194eb4b417",
  "newPassword": "123456"
}
```

## Resultado Esperado
A senha do usuário **Maria Rafaela Lopes Mota** (`rafaela.lopes@lefil.com.br`) será alterada para `123456`.
