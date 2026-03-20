

## Renomear "Categorias" → "Nichos" em toda a aplicação

Substituição de todas as ocorrências de texto visível ao usuário de "Categoria/Categorias" por "Nicho/Nichos". Nenhuma alteração em nomes de tabelas, tipos, variáveis ou rotas — apenas os textos exibidos na UI.

### Arquivos a editar (≈12 arquivos)

| Arquivo | Alterações de texto |
|---------|-------------------|
| `src/pages/Categories.tsx` | Breadcrumb, título, subtítulo, popover de ajuda, botão "Nova Categoria" → "Novo Nicho", dialog de exclusão |
| `src/pages/CategoryView.tsx` | Breadcrumb "Categorias" → "Nichos" |
| `src/components/AppSidebar.tsx` | Label "Categorias" → "Nichos", tooltip, texto vazio "Nenhuma categoria" → "Nenhum nicho" |
| `src/components/CategorySelector.tsx` | Label "Categoria" → "Nicho" |
| `src/components/categorias/CategoryList.tsx` | Textos vazios "Nenhuma categoria criada" → "Nenhum nicho criado", "Crie categorias para organizar..." → "Crie nichos para organizar..." |
| `src/components/categorias/CategoryDialog.tsx` | Título "Nova Categoria"/"Editar Categoria" → "Novo Nicho"/"Editar Nicho", placeholder da descrição |
| `src/components/categorias/CategoryBadge.tsx` | "Sem categoria" → "Sem nicho" |
| `src/components/categorias/AddToCategoryPopover.tsx` | Botão "Categoria" → "Nicho", título "Categorias" → "Nichos", texto vazio |
| `src/components/historico/ActionCardMenu.tsx` | "Mudar categoria"/"Adicionar à categoria" → "Mudar nicho"/"Adicionar ao nicho", "Categorias" → "Nichos", textos vazios |
| `src/components/historico/HistoryFilterSidebar.tsx` | Título do filtro "Categoria" → "Nicho", "Todas as categorias" → "Todos os nichos", "Sem categoria" → "Sem nicho" |
| `src/pages/ActionView.tsx` | "Sem categoria" → "Sem nicho", "Categorias" → "Nichos", "Nenhuma categoria criada" → "Nenhum nicho criado" |
| `src/pages/CreateImage.tsx` | Comentário "Categoria (opcional)" → "Nicho (opcional)" (se visível) |

### O que NÃO muda
- Nomes de tabelas no banco (`action_categories`, etc.)
- Nomes de tipos TypeScript (`ActionCategory`, `CategoryWithCount`, etc.)
- Nomes de arquivos/pastas (`categorias/`, `useCategories.ts`, etc.)
- Rotas URL (`/categories`, `/categories/:id`)
- Query keys (`['categories']`, etc.)

