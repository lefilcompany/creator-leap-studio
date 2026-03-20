

# Reorganizar o Histórico com Sidebar de Filtros Retrátil

## Problema
A página de histórico concentra muita informação na toolbar (busca, filtro de marca, filtro de tipo, ordenação, toggle de visualização), tornando a experiência visual pesada.

## Solução
Criar um layout com **sidebar de filtros lateral** na página de histórico, inspirado na imagem de referência. A sidebar terá seções colapsáveis (accordion) para organizar os filtros por categoria, mantendo a área principal limpa apenas com busca + cards/lista.

```text
┌─────────────────────────────────────────────────┐
│  Banner + Header (mantém como está)             │
├──────────┬──────────────────────────────────────┤
│ Sidebar  │  Busca + View Toggle (simplificado) │
│ Filtros  │──────────────────────────────────────│
│          │                                      │
│ ▼ Tipo   │  Grid/List de ações                  │
│   • Criar│                                      │
│   • Revis│                                      │
│   • Plane│                                      │
│          │                                      │
│ ▼ Marca  │                                      │
│   • Marc1│                                      │
│   • Marc2│                                      │
│          │                                      │
│ ▼ Ordenar│                                      │
│   • Data │                                      │
│   • Tipo │                                      │
└──────────┴──────────────────────────────────────┘
```

## Implementação

### 1. Criar componente `HistoryFilterSidebar`
**Arquivo:** `src/components/historico/HistoryFilterSidebar.tsx`

- Sidebar interna à página (não global), com largura fixa (~240px) em desktop
- Usa `Collapsible` do Radix para seções retráteis com animação de chevron
- Três seções colapsáveis:
  - **Tipo de Ação**: lista de botões (Criar conteúdo, Criar rápido, Revisar, Planejar, Gerar vídeo) com ícones e cores do `ACTION_STYLE_MAP`
  - **Marca**: lista de marcas do usuário com dot de cor
  - **Ordenação**: opções Data (mais recente/antigo) e Tipo (A-Z/Z-A)
- Cada item é clicável, com highlight visual quando ativo (similar ao `isActive` da sidebar principal)
- Botão "Limpar filtros" no rodapé quando há filtros ativos
- No mobile: colapsa em um sheet/drawer acionado por botão de filtro

### 2. Simplificar a toolbar do `ActionList`
**Arquivo:** `src/components/historico/ActionList.tsx`

- Remover os `Select` de marca e tipo da toolbar (agora ficam na sidebar)
- Manter apenas: campo de busca + toggle grid/list + tab Todas/Favoritas
- Toolbar fica mais limpa e focada

### 3. Atualizar layout da página `History`
**Arquivo:** `src/pages/History.tsx`

- Após o header card, usar `flex` row com sidebar à esquerda e conteúdo à direita
- No mobile: sidebar vira um botão "Filtros" que abre Sheet lateral
- Estado de filtros continua gerenciado no `History.tsx` e passado como props

### Detalhes Técnicos

- Usa `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent` do Radix (já instalado)
- Seções começam abertas por padrão (`defaultOpen={true}`)
- Chevron rotaciona com CSS transition no estado aberto/fechado
- Itens de filtro são botões com estilo pill/highlight ao selecionar
- Contadores de resultados por categoria (opcional, se performance permitir)
- Animações com `transition-all duration-200` para manter consistência
- Mobile: `Sheet` lateral com `side="left"` contendo o mesmo conteúdo da sidebar

