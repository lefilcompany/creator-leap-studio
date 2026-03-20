

# Sistema de Categorias para Ações

## Visão Geral
Criar um sistema de categorias (collections/pastas) onde usuários organizam suas criações. Categorias são criadas pelo usuário, com controle de visibilidade (pessoal ou equipe) e permissões (leitor/editor).

## Banco de Dados

### Tabela `action_categories`
```sql
CREATE TABLE action_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  color text DEFAULT '#6366f1',
  icon text DEFAULT 'folder',
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id uuid,
  visibility text NOT NULL DEFAULT 'personal', -- 'personal' | 'team'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Tabela `action_category_members` (permissões)
```sql
CREATE TABLE action_category_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES action_categories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'viewer', -- 'viewer' | 'editor'
  created_at timestamptz DEFAULT now(),
  UNIQUE(category_id, user_id)
);
```

### Tabela `action_category_items` (relação ação↔categoria)
```sql
CREATE TABLE action_category_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES action_categories(id) ON DELETE CASCADE,
  action_id uuid NOT NULL,
  added_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(category_id, action_id)
);
```

### RLS Policies
- Dono da categoria + membros da equipe (se `visibility=team`) podem ver
- Apenas dono e `editors` podem adicionar/remover itens
- Apenas dono pode editar/deletar a categoria
- Função `SECURITY DEFINER` para checar permissão de categoria

## Sidebar — Novo Item de Navegação

Adicionar **"Categorias"** na sidebar (`AppSidebar.tsx`) entre "Histórico" e "Equipe", usando o ícone `FolderOpen` do Lucide. Rota: `/categories`.

```text
Home
Marcas
Temas Estratégicos
Personas
Histórico
📁 Categorias    ← NOVO
Equipe
```

## Página de Categorias (`/categories`)

Nova página seguindo o padrão visual do sistema (banner + header card):
- Lista de categorias em grid (cards) com nome, cor, ícone, contagem de ações, badge de visibilidade (Pessoal/Equipe)
- Dialog para criar/editar categoria com campos: nome, descrição, cor, visibilidade, membros e permissões
- Clicar numa categoria abre uma sub-página (`/categories/:id`) mostrando as ações agrupadas (reutilizando `ActionList`)

## Integração no Histórico

### Filtro na Sidebar de Filtros
Adicionar nova seção colapsável **"Categoria"** no `HistoryFilterSidebar.tsx` com:
- "Todas as categorias" (default)
- "Sem categoria" — filtra ações que não pertencem a nenhuma categoria
- Lista das categorias do usuário com dot de cor

### Badge nos Cards/Lista
No `ActionList.tsx`, exibir um badge de categoria nos action cards e nas linhas da tabela:
- Badge pequeno com a cor da categoria e nome truncado
- Se não tiver categoria: texto "Sem categoria" em tom muted/italic

## Integração nos Formulários de Criação

Nos formulários de criação (`CreateImage.tsx`, `CreateContent.tsx`, `ReviewContent.tsx`, `PlanContent.tsx`):
- Adicionar campo opcional **"Categoria"** (Select) ao final do formulário, antes do botão de gerar
- Listar categorias onde o usuário é dono ou editor
- Ao salvar a ação, criar o registro em `action_category_items` automaticamente

## Adicionar Ações Existentes a Categorias

Na página de detalhes da ação (`ActionView.tsx`) e no card do histórico:
- Botão/menu para "Adicionar à categoria" que abre um popover com lista de categorias
- Permitir mover entre categorias ou remover de categoria

## Arquivos a Criar/Editar

### Novos
- `src/pages/Categories.tsx` — página de listagem
- `src/pages/CategoryView.tsx` — página de detalhes da categoria
- `src/components/categorias/CategoryDialog.tsx` — criar/editar
- `src/components/categorias/CategoryList.tsx` — grid de cards
- `src/components/categorias/CategoryBadge.tsx` — badge reutilizável
- `src/components/categorias/AddToCategoryPopover.tsx` — popover para adicionar ação
- `src/hooks/useCategories.ts` — hook com queries/mutations
- `src/types/category.ts` — tipos TypeScript
- Migration SQL para as 3 tabelas + RLS

### Editados
- `src/components/AppSidebar.tsx` — novo nav item
- `src/App.tsx` — novas rotas `/categories` e `/categories/:id`
- `src/components/historico/HistoryFilterSidebar.tsx` — seção de filtro por categoria
- `src/components/historico/ActionList.tsx` — badge de categoria nos cards/lista
- `src/pages/History.tsx` — estado do filtro de categoria
- `src/types/action.ts` — campo `category` no `ActionSummary`
- `src/pages/CreateImage.tsx` — campo de categoria no form
- `src/pages/CreateContent.tsx` — campo de categoria no form
- `src/pages/ReviewContent.tsx` — campo de categoria no form
- `src/pages/PlanContent.tsx` — campo de categoria no form
- `src/lib/translations.ts` — traduções pt/en
- `src/hooks/useHistoryActions.ts` — filtro de categoria na query

