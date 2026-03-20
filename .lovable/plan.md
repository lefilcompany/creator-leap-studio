

# Visibilidade com Membros e Sidebar com Dropdown de Categorias

## Visão Geral
Duas mudanças principais:
1. **CategoryDialog**: Substituir o select de visibilidade por um sistema de membros com painel lateral (Sheet), onde o criador é sempre incluído por padrão e pode adicionar membros da equipe como "Leitor" ou "Editor"
2. **Sidebar**: Transformar o item "Categorias" em um dropdown colapsável com duas seções: "Minhas Categorias" e "Compartilhadas Comigo"

## 1. CategoryDialog — Painel de Membros

### Comportamento
- O campo "Visibilidade" atual será substituído por uma seção "Acesso"
- Mostra por padrão o criador (usuário logado) como "Dono" — sempre fixo, não removível
- Botão "Adicionar membro" abre um `Sheet` lateral (como na imagem de referência do Kanban)
- No Sheet: lista membros da equipe (via `useTeamMembers`) com avatar, nome e um select de papel (Leitor/Editor)
- Membros adicionados aparecem como chips/lista no dialog principal com papel e botão de remover
- Se o usuário não tem equipe, a seção mostra apenas o dono sem opção de adicionar

### Dados
- Ao salvar, além dos dados da categoria, enviar array de membros `{ userId, role }[]`
- Mutation `createCategory` e `updateCategory` no hook devem também inserir/atualizar `action_category_members`
- Ao criar: inserir membros no `action_category_members` após criar a categoria
- Ao editar: diff dos membros (adicionar novos, remover removidos, atualizar roles)
- Quando há membros além do dono, `visibility` automaticamente muda para `'team'`

### Arquivos
- **Editar**: `src/components/categorias/CategoryDialog.tsx` — redesign da seção de visibilidade + Sheet de membros
- **Editar**: `src/hooks/useCategories.ts` — mutations para gerenciar membros junto com a categoria
- **Editar**: `src/types/category.ts` — adicionar tipo `CategoryMember` com perfil

## 2. Sidebar — Dropdown Colapsável de Categorias

### Comportamento
- O item "Categorias" na sidebar vira um `Collapsible` com chevron
- Ao expandir, mostra duas seções:
  - **Minhas Categorias**: categorias onde `user_id === auth.uid()`
  - **Compartilhadas Comigo**: categorias onde o usuário é membro (via `action_category_members`) mas não é dono
- Cada categoria mostra um dot de cor + nome truncado, clicável para `/categories/:id`
- Link "Ver todas" no final leva para `/categories`
- No estado colapsado da sidebar (icon mode): mantém apenas o ícone `FolderOpen` como tooltip

### Dados
- Reutilizar `useCategories` mas separar em `myCategories` e `sharedCategories`
- Para "compartilhadas comigo": query adicional em `action_category_members` onde `user_id = auth.uid()` e join com `action_categories` onde `user_id != auth.uid()`

### Arquivos
- **Editar**: `src/components/AppSidebar.tsx` — substituir NavItem simples por componente colapsável com lista de categorias
- **Editar**: `src/hooks/useCategories.ts` — adicionar query `useSharedCategories` ou retornar categorias separadas

## 3. Hook useCategories — Ajustes

### Novas funcionalidades
- `createCategory` aceita `members: { userId: string; role: 'viewer' | 'editor' }[]` e insere em `action_category_members` após criar
- `updateCategory` aceita `members` e faz sync (delete all + insert)
- Nova query `useCategoryMembers(categoryId)` para carregar membros de uma categoria com perfil
- Separar retorno em `myCategories` e `sharedCategories` baseado em `user_id === auth.uid()` vs membro

## Detalhes Técnicos

- Sheet de membros usa `side="right"` para parecer painel apêndice lateral
- Lista de membros da equipe vem de `useTeamMembers(user.teamId)`
- Cada membro tem toggle entre Leitor/Editor usando `NativeSelect` ou botões segmentados
- Sidebar colapsável usa `Collapsible`/`CollapsibleTrigger`/`CollapsibleContent` do Radix (já instalado)
- Limitar exibição na sidebar a ~5 categorias por seção + "Ver mais"

