

## Reformulacao Completa da Pagina de Historico

### Objetivo
Transformar a pagina de Historico para exibir as acoes em formato de cards visuais (grid/list) com imagem em destaque, informacoes contextuais ricas, e toolbar padronizada seguindo o mesmo design system das paginas de Marcas, Temas e Personas.

### Mudancas Visuais Principais

**1. Banner e Header (seguindo padrao de Marcas)**
- Ajustar o header card para usar `shadow-lg` (como Marcas) em vez de `shadow-sm`
- Remover `border-border/50` e usar o mesmo estilo clean de Marcas
- Mover os filtros (Marca, Tipo de Acao) para dentro da toolbar do ActionList, ao lado da barra de pesquisa

**2. Novo Layout do ActionList - Cards Visuais**
- Substituir a lista compacta atual por um grid de cards (4 colunas desktop, 2 tablet, 1 mobile)
- Cada card tera:
  - Imagem gerada em destaque (aspect-ratio 16:9) como area principal do card, com fallback para icone do tipo de acao
  - Titulo/descricao extraido de `action.details` (ex: titulo do conteudo, objetivo do planejamento)
  - Badges informativos: tipo de acao, plataforma, formato da imagem, estilo
  - Data de criacao formatada
  - Nome da marca associada
- Manter tambem opcao de visualizacao em lista (toggle grid/list)

**3. Toolbar Padronizada**
- Barra de pesquisa com icone e botao limpar (X)
- Filtros de Marca e Tipo de Acao movidos para a toolbar (NativeSelect)
- Botoes de ordenacao (Nome, Data)
- Toggle de visualizacao (Blocos/Lista)
- Botao "Limpar" filtros com estilo hover accent

### Detalhes Tecnicos

**Arquivos a modificar:**

1. **`src/types/action.ts`** - Expandir `ActionSummary` para incluir campos adicionais:
   - `imageUrl?: string` (de `result.imageUrl`)
   - `platform?: string` (de `details.platform`)
   - `title?: string` (de `result.title`)
   - `details?: object` (metadados adicionais como objetivo, prompt resumido)

2. **`src/pages/History.tsx`**:
   - Alterar header card: remover `border-border/50`, usar `shadow-lg`
   - Remover os NativeSelect do header e passar `brands`, `brandFilter`, `typeFilter` como props para ActionList
   - Expandir a query do Supabase para trazer `result` (imageUrl, title) e `details` (platform, objective) no select
   - Mapear esses campos extras no ActionSummary

3. **`src/components/historico/ActionList.tsx`** - Reescrever completamente:
   - Adicionar toolbar padronizada (search + filtros NativeSelect + sort buttons + view toggle)
   - Criar componente `ActionCard` para visualizacao em grid:
     - Area de imagem (16:9) com a imagem gerada ou placeholder com icone
     - Titulo/descricao truncado (2 linhas)
     - Badges: tipo de acao (com cor), plataforma, etc.
     - Data formatada (dia mes ano, hora:minuto)
     - Nome da marca
   - Criar visualizacao em lista com tabela similar a Marcas
   - Manter paginacao apenas no modo lista (grid sem paginacao para fluxo continuo, seguindo padrao)

**Estrutura do Card (Grid):**

```text
+----------------------------------+
|  [Imagem gerada 16:9]           |
|  ou placeholder com icone        |
+----------------------------------+
|  Titulo / descricao truncada     |
|                                  |
|  [Badge Tipo] [Badge Platform]   |
|                                  |
|  06 de jan. de 2026, 12:20       |
|  Marca: Nome da Marca            |
+----------------------------------+
```

**Estrutura do Card (Lista):**

```text
| Cor | Imagem | Tipo + Titulo | Marca | Plataforma | Data |
```

**Informacoes contextuais por tipo de acao:**
- **Criar conteudo / Criar conteudo rapido**: imagem gerada, titulo, plataforma, hashtags count
- **Revisar conteudo**: imagem original/revisada, feedback resumido
- **Planejar conteudo**: icone de calendario, objetivo do planejamento
- **Gerar video**: thumbnail do video ou icone, duracao se disponivel

**Fallback de imagem**: quando nao houver imagem gerada, exibir um placeholder com o icone do tipo de acao centralizado sobre um fundo gradiente usando as cores do tipo.

