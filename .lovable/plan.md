

## Plano: Sistema de Lixeira (Soft Delete) para Ações

### Resumo
Adicionar opção "Apagar" no menu de cada ação no histórico, com soft delete (coluna `deleted_at`). Criar página "Lixeira" acessível pela engrenagem do header. Itens na lixeira são exibidos com contagem regressiva e podem ser restaurados ou excluídos permanentemente. Após 30 dias, são apagados automaticamente.

---

### 1. Migração de banco de dados

- Adicionar coluna `deleted_at timestamptz` (nullable, default null) na tabela `actions`
- Criar índice parcial em `deleted_at` para performance
- Atualizar a função `get_action_summaries` para filtrar `WHERE deleted_at IS NULL`
- Criar função SQL `permanent_delete_old_trash()` que deleta ações com `deleted_at < NOW() - INTERVAL '30 days'`

### 2. Opção "Apagar" no ActionCardMenu

- Adicionar prop `onDelete` ao `ActionCardMenu`
- Adicionar item "Apagar" com ícone `Trash2` e cor destrutiva no dropdown
- Incluir diálogo de confirmação antes de mover para lixeira
- O delete faz `UPDATE actions SET deleted_at = NOW() WHERE id = ?`

### 3. Hook `useTrash`

- Novo hook `src/hooks/useTrash.ts`:
  - Query para listar ações onde `deleted_at IS NOT NULL` (do time do usuário)
  - Mutation `restoreAction`: seta `deleted_at = NULL`
  - Mutation `permanentDelete`: deleta fisicamente a ação
  - Mutation `emptyTrash`: deleta todas as ações da lixeira
  - Mutation `softDelete`: seta `deleted_at = NOW()`

### 4. Página Lixeira

- Nova página `src/pages/Trash.tsx`:
  - Lista de ações deletadas com informações de quando foram deletadas
  - Badge mostrando dias restantes antes da exclusão permanente
  - Botões para restaurar individualmente ou esvaziar lixeira
  - Mensagem vazia quando não há itens

### 5. Rota e navegação

- Adicionar rota `/trash` dentro do `DashboardLayout` em `App.tsx`
- Adicionar link "Lixeira" com ícone `Trash2` no dropdown da engrenagem do `Header.tsx`

### 6. Limpeza automática (cron)

- Criar edge function `cleanup-trash/index.ts` que executa `DELETE FROM actions WHERE deleted_at < NOW() - INTERVAL '30 days'`
- Agendar via `pg_cron` para rodar diariamente

---

### Detalhes técnicos

- Todas as queries existentes de actions precisam adicionar filtro `deleted_at IS NULL` (na função SQL `get_action_summaries` e no hook `useActions`)
- A RLS existente já protege o acesso — o soft delete usa UPDATE que já tem policy
- O delete permanente usa a policy DELETE existente (`can_access_resource`)

