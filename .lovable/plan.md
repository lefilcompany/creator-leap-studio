

## Plano: Corrigir contagem de conteudos e carrossel de atividade recente

### Problema identificado

A funcao `get_action_summaries` e as colunas `thumb_path`/`asset_path` nao existem no banco de dados de teste. As migracoes anteriores falharam parcialmente, o que faz com que:
- O card "Conteudos Criados" mostre 0
- O carrossel "Atividade Recente" mostre "Nenhuma atividade ainda"

### Solucao

**1. Corrigir o banco de dados (nova migracao)**

Criar uma migracao que:
- Adiciona as colunas `thumb_path` e `asset_path` na tabela `actions` (se nao existirem)
- Cria o bucket `creations` no storage (se nao existir)
- Recria a funcao `get_action_summaries` com suporte a cursor pagination e retorno de `thumb_path`
- Adiciona indice para performance de cursor pagination

**2. Corrigir a query de contagem no Dashboard**

O `actionsCount` usa o RPC com `p_limit: 1` para pegar `total_count`. Isso e correto, mas como fallback caso o RPC falhe, adicionar tratamento de erro e alternativa com query direta (`count` na tabela `actions` filtrada por `team_id`).

**3. Corrigir o componente DashboardRecentActivity**

O componente ja esta bem construido com carrossel horizontal, cards com imagem, tipo e marca. Precisa apenas garantir que os dados chegam corretamente (o problema e 100% no banco).

### Detalhes tecnicos

**Migracao SQL:**
```sql
-- Colunas na tabela actions
ALTER TABLE public.actions
  ADD COLUMN IF NOT EXISTS thumb_path text,
  ADD COLUMN IF NOT EXISTS asset_path text;

-- Bucket creations
INSERT INTO storage.buckets (id, name, public)
VALUES ('creations', 'creations', true)
ON CONFLICT (id) DO NOTHING;

-- Funcao get_action_summaries (com thumb_path)
CREATE OR REPLACE FUNCTION public.get_action_summaries(...)
  -- Mesma funcao ja definida nas migracoes anteriores

-- Indice para cursor pagination
CREATE INDEX IF NOT EXISTS idx_actions_cursor 
  ON public.actions (created_at DESC, id DESC);
```

**Dashboard.tsx** - Manter o uso do RPC `get_action_summaries` para ambos `actionsCount` e `recentActivities`, porem com tratamento de erro robusto:
- Se o RPC falhar, fazer fallback com `supabase.from('actions').select('*', { count: 'exact', head: true })` filtrado por `team_id` via RLS
- Para atividades recentes, fallback com query direta na tabela `actions` com join em `brands`

**DashboardRecentActivity.tsx** - Ajustar para lidar com o formato de dados vindo tanto do RPC quanto do fallback direto.

### Arquivos alterados

1. Nova migracao SQL (via ferramenta de migracao)
2. `src/pages/Dashboard.tsx` - queries com fallback
3. `src/components/dashboard/DashboardRecentActivity.tsx` - ajustes menores de compatibilidade

