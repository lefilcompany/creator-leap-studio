
# Plano: Aplicar padrões de Marcas nos Temas Estrategicos

## Resumo

Replicar toda a experiencia visual e de navegacao da pagina de Marcas para a pagina de Temas Estrategicos, incluindo:
- Visualizacao em Grid e Lista com toggle
- Cor identificadora da marca vinculada visivel nos cards/linhas
- Nome e avatar da marca visivel nos blocos e lista
- Navegacao para pagina dedicada de detalhes do tema (`/themes/:themeId`)
- Layout da pagina de detalhes seguindo o padrao do BrandView

---

## Mudancas Planejadas

### 1. Carregar dados da marca com cor e avatar na pagina de Temas

**Arquivo:** `src/pages/Themes.tsx`

A query de brands atualmente nao carrega `brand_color` nem `avatar_url`. Adicionar esses campos ao select para que os cards dos temas possam herdar a cor identificadora da marca.

### 2. Refatorar ThemeList para ter Grid + Lista (igual BrandList)

**Arquivo:** `src/components/temas/ThemeList.tsx`

Substituir completamente o componente para seguir o padrao do BrandList:
- Toolbar com busca, botoes de ordenacao (Nome/Data), toggle Grid/Lista
- **Grid view**: Cards com barra de cor da marca no topo, avatar/inicial da marca, titulo do tema, nome da marca, data
- **List view**: Tabela com avatar da marca, titulo do tema, nome da marca, data
- Paginacao apenas no modo lista (igual Marcas)
- Ao clicar, navegar para `/themes/:themeId` ao inves de abrir Sheet

### 3. Criar pagina ThemeView (detalhe do tema)

**Novo arquivo:** `src/pages/ThemeView.tsx`

Pagina dedicada para visualizar e editar um tema, seguindo o padrao do BrandView:
- Header hero com gradiente usando a cor da marca vinculada
- Breadcrumb com navegacao de volta para Temas (preservando viewMode)
- Avatar da marca no header
- Edicao inline dos campos do tema
- Botao salvar com deteccao de mudancas
- Botao deletar com confirmacao
- Secao de paleta de cores do tema

### 4. Adicionar rota para ThemeView

**Arquivo:** `src/App.tsx`

Adicionar rota: `<Route path="themes/:themeId" element={<ThemeView />} />`

### 5. Atualizar pagina Themes.tsx

**Arquivo:** `src/pages/Themes.tsx`

- Remover Sheet/Drawer de detalhes (nao sera mais usado)
- Remover estado de selectedTheme e logica de carregamento de detalhes
- Alterar `onSelectTheme` para navegar para `/themes/:themeId`
- Adicionar suporte a `initialViewMode` vindo do state da rota
- Simplificar o layout para seguir o padrao de Brands (sem `overflow-hidden` no wrapper)

### 6. Atualizar tipo StrategicThemeSummary

**Arquivo:** `src/types/theme.ts`

Nenhuma mudanca necessaria - o tipo ja tem `brandId` que e o suficiente para buscar cor/avatar do mapa de brands.

---

## Detalhes Tecnicos

### Fluxo de dados para cor da marca nos temas

```text
Themes.tsx carrega brands com brand_color + avatar_url
  -> passa para ThemeList como prop
  -> ThemeList cria brandMap com {id, name, brandColor, avatarUrl}
  -> Cards/linhas usam brandMap para exibir cor e avatar
```

### Estrutura do ThemeCard (Grid)

```text
+----------------------------------+
| [barra de cor da marca]          |
|                                  |
|  [avatar marca] Titulo do Tema   |
|                 Marca: Nome      |
|                                  |
|  Criado em DD/MM/YYYY    [cor]   |
+----------------------------------+
```

### Estrutura do ThemeView

```text
[gradiente com cor da marca]
  [breadcrumb: Temas > Nome do Tema]
  [avatar marca] Nome do Tema
                 Marca: Nome da Marca

[Coluna principal]          [Coluna lateral]
  Secao Informacoes           Paleta de Cores
  - Titulo                    (ColorPicker)
  - Descricao
  - Tom de Voz
  - Publico-Alvo
  - Objetivos
  - Macro Temas
  - Acao Esperada
  - Formatos
  - Plataformas
  - Hashtags
  - Info Adicional
```

### Arquivos criados
- `src/pages/ThemeView.tsx`

### Arquivos modificados
- `src/pages/Themes.tsx` (simplificar, remover Sheet/Drawer, navegar para rota)
- `src/components/temas/ThemeList.tsx` (refatorar para Grid+Lista)
- `src/App.tsx` (adicionar rota)
