

# Otimizacao do Historico de Criacoes

## Contexto Atual

A tabela `actions` (962 registros) ja possui `team_id`, indexes otimizados (`idx_actions_team_created`), e a funcao `get_action_summaries` que filtra base64. Porem, existem registros com ate **~4MB** de dados base64 armazenados no campo `result`, o que e o principal gargalo.

## Plano de Implementacao

### 1. Adicionar colunas de storage na tabela `actions`

Adicionar `thumb_path` e `asset_path` para referenciar arquivos no Storage em vez de base64 no banco.

```sql
ALTER TABLE actions
  ADD COLUMN IF NOT EXISTS thumb_path text,
  ADD COLUMN IF NOT EXISTS asset_path text;
```

### 2. Criar bucket de storage `creations`

Bucket publico com estrutura `{team_id}/{yyyy}/{mm}/{id}/thumb.webp` e `asset.webp`.

### 3. Edge Function para migrar base64 existente

Criar `migrate-action-images` que:
- Busca actions com base64 no `result->imageUrl`
- Converte e faz upload para o bucket `creations`
- Gera thumbnail (versao reduzida)
- Atualiza `thumb_path`, `asset_path` e limpa o base64 do `result`

### 4. Atualizar funcao `get_action_summaries` para cursor pagination

Substituir OFFSET por cursor-based pagination usando `(created_at, id)`:

```sql
-- Parametros: p_cursor_created_at, p_cursor_id (opcionais)
-- Filtrar: WHERE created_at < cursor OR (created_at = cursor AND id < cursor_id)
```

### 5. Atualizar o frontend

**`src/pages/History.tsx`:**
- Substituir `currentPage` por estado de cursor (`lastCreatedAt`, `lastId`)
- Usar `useInfiniteQuery` do TanStack Query para "carregar mais"
- Buscar apenas `thumb_path` na listagem

**`src/components/historico/ActionList.tsx`:**
- Usar `thumb_path` para exibir thumbnails nos cards
- Carregar imagem completa (`asset_path`) apenas no ActionDetails
- Adicionar filtro de intervalo de datas
- Botao "Carregar mais" em vez de paginacao numerada

**`src/components/historico/ActionDetails.tsx`:**
- Carregar `asset_path` (imagem/video completo) sob demanda ao abrir detalhes

### 6. Atualizar edge functions de criacao

Alterar as edge functions (`generate-image`, `generate-caption`, `generate-video`, etc.) para:
- Fazer upload do resultado para o bucket `creations`
- Gerar thumbnail
- Salvar `thumb_path` e `asset_path` na action em vez de base64

---

## Detalhes Tecnicos

### Estrutura de Storage
```text
creations/
  {team_id}/
    {yyyy}/
      {mm}/
        {action_id}/
          thumb.webp    (300x300, qualidade 60)
          asset.webp    (original)
```

### Cursor Pagination (funcao SQL atualizada)

```sql
CREATE OR REPLACE FUNCTION get_action_summaries(
  p_team_id uuid,
  p_brand_filter uuid DEFAULT NULL,
  p_type_filter text DEFAULT NULL,
  p_cursor_created_at timestamptz DEFAULT NULL,
  p_cursor_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 24
)
RETURNS TABLE(...)
-- WHERE (p_cursor_created_at IS NULL) OR
--   (created_at < p_cursor_created_at) OR
--   (created_at = p_cursor_created_at AND id < p_cursor_id)
-- ORDER BY created_at DESC, id DESC
-- LIMIT p_limit
```

### Frontend: useInfiniteQuery

```typescript
const { data, fetchNextPage, hasNextPage } = useInfiniteQuery({
  queryKey: ['history-actions', teamId, filters],
  queryFn: ({ pageParam }) => fetchActions(pageParam),
  getNextPageParam: (lastPage) => {
    const last = lastPage.actions.at(-1);
    return last ? { createdAt: last.createdAt, id: last.id } : undefined;
  },
});
```

### RLS
A tabela `actions` ja possui RLS adequado via `can_access_resource(user_id, team_id)`. Nenhuma alteracao necessaria.

### Arquivos a Modificar
- **Migracao SQL**: nova migracao para `thumb_path`, `asset_path`, bucket, e funcao atualizada
- `src/pages/History.tsx` - cursor pagination + useInfiniteQuery
- `src/components/historico/ActionList.tsx` - thumbnails, carregar mais, filtro de datas
- `src/components/historico/ActionDetails.tsx` - carregar asset completo sob demanda
- `supabase/functions/migrate-action-images/index.ts` - nova edge function de migracao
- Edge functions de geracao (ajustar para salvar no storage)

