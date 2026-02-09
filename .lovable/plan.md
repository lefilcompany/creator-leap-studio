

# Redesign da Pagina de Marcas

## Resumo

Redesenhar a listagem de marcas com: remoção de bordas desnecessárias, visualização em lista (tabela) e em blocos (grid de cards), cor identificadora por marca, scroll da página inteira com paginação, e melhorias visuais gerais.

## Mudanças Planejadas

### 1. Nova coluna no banco de dados
- Adicionar coluna `brand_color` (text, nullable) na tabela `brands` para armazenar a cor identificadora da marca (hex, ex: `#e53e3e`).

### 2. Atualizar tipos TypeScript
- Adicionar `brandColor: string | null` ao tipo `Brand`
- Adicionar `brandColor` ao tipo `BrandSummary` (para exibir a cor na listagem)

### 3. Redesenhar `BrandList.tsx` completamente
- **Remover bordas desnecessárias** - eliminar a borda externa do container e bordas internas excessivas
- **Toggle lista/blocos** - adicionar botoes de alternancia (icone lista e icone grid) no topo junto com a busca
- **Modo Lista (tabela)** - tabela limpa sem bordas pesadas, estilo similar a imagem de referencia com linhas limpas, hover suave, e a bolinha de cor da marca antes do nome
- **Modo Blocos (grid)** - cards em grid 3 colunas (desktop), 2 (tablet), 1 (mobile), cada card mostrando: barra de cor no topo, inicial da marca, nome, responsavel, data de criacao
- **Scroll da pagina** - remover `overflow-hidden` do container pai para que a pagina inteira role, em vez de restringir ao viewport
- **Paginação** - manter paginação existente no rodapé

### 4. Atualizar `Brands.tsx` (página)
- Mudar layout de `overflow-hidden` para `overflow-auto` para permitir scroll completo da pagina
- Passar `brandColor` nos dados do BrandSummary carregados do banco
- O conteudo da pagina (banner + header + lista) deve fluir naturalmente sem restricao de altura

### 5. Atualizar `BrandDialog.tsx`
- Adicionar seletor de cor da marca (um campo simples com opcoes pre-definidas usando cores do sistema: primary, secondary, accent, e mais algumas harmonicas)
- Salvar `brand_color` no banco ao criar/editar marca

### 6. Cores pre-definidas para identificacao
Oferecer 8-10 cores harmonicas com a paleta do sistema:
- Rosa (primary), Roxo (secondary), Azul (accent), Verde, Laranja, Amarelo, Vermelho, Teal, Indigo, Rosa claro

## Detalhes Tecnicos

### Migração SQL
```sql
ALTER TABLE public.brands ADD COLUMN brand_color text;
```

### Arquivos modificados
1. **`src/types/brand.ts`** - adicionar `brandColor`
2. **`src/components/marcas/BrandList.tsx`** - reescrever com toggle lista/blocos, remover bordas, melhorar visual
3. **`src/pages/Brands.tsx`** - ajustar layout para scroll, carregar `brand_color`, passar para BrandList
4. **`src/components/marcas/BrandDialog.tsx`** - adicionar seletor de cor da marca

### Componente de visualização em blocos (dentro de BrandList)
Cada card terá:
- Barra superior com a cor da marca (4px)
- Circulo com inicial e cor de fundo da marca
- Nome da marca (bold)
- Responsavel (muted)
- Data de criacao
- Hover com elevacao sutil

### Layout da pagina (scroll natural)
- Remover `h-full overflow-hidden` do wrapper principal
- Usar `min-h-full` e permitir que o conteudo defina a altura
- A pagina inteira (banner + header + lista + paginacao) rola naturalmente

