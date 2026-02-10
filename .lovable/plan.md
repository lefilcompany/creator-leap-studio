
# Refatoracao Completa da Sidebar (Navbar Lateral)

## Problemas Identificados

1. **Animacoes desnecessarias com Framer Motion** - Cada label de nav item usa `motion.span` com animacoes de entrada/saida que causam flickering ao expandir/retrair
2. **AnimatePresence no logo** - Troca animada entre logo completo e simbolo a cada toggle, causando delay visual
3. **Complexidade excessiva** - O componente mistura logica de mobile (Sheet) com desktop (Sidebar) de forma confusa
4. **Transicoes inconsistentes** - Duracoes variadas (300ms, 400ms, 500ms) espalhadas pelo codigo

## Solucao Proposta

Reescrever o `AppSidebar.tsx` com uma abordagem limpa e funcional:

### 1. Remover Framer Motion completamente da sidebar
- Substituir `motion.span` por `<span>` simples com classes CSS de transicao (`transition-opacity`, `overflow-hidden`)
- Remover `AnimatePresence` do logo - usar CSS para controlar visibilidade (opacity + width transition)
- O texto dos nav items sera ocultado via `overflow-hidden` e `w-0`/`w-auto` no container quando colapsado

### 2. Logo simplificado
- Mostrar sempre o simbolo pequeno (`creatorSymbol`)
- Quando expandido, mostrar o logo completo ao lado ou no lugar, usando apenas CSS transitions (`opacity` e `max-width`)
- Sem troca animada de imagem - usar uma abordagem com ambas as imagens renderizadas e controladas por `opacity-0`/`opacity-100`

### 3. NavItem limpo
- Usar classes Tailwind para o estado ativo (`bg-primary/10 text-primary`)
- Texto oculto no modo colapsado via `group-data-[state=collapsed]` do proprio Sidebar component do shadcn
- Tooltip automatico quando colapsado (ja suportado nativamente pelo `SidebarMenuButton` com prop `tooltip`)

### 4. ActionButton simplificado
- Manter os 3 botoes de acao (Criar, Revisar, Planejar) com suas cores de variante
- Remover `motion.span` - usar CSS transitions
- Manter o comportamento de reset ao clicar na rota ativa

### 5. Secao de creditos
- Simplificar o bloco de creditos removendo animacoes desnecessarias
- Usar tooltip nativo quando colapsado

### 6. Transicao unificada
- Todas as transicoes usam `duration-300 ease-in-out` para consistencia
- A sidebar do shadcn ja lida com a transicao de largura via CSS (`transition-[width] duration-500`)

## Detalhes Tecnicos

### Arquivos modificados
- `src/components/AppSidebar.tsx` - Reescrita completa removendo Framer Motion e simplificando

### Dependencias removidas do componente
- `motion`, `AnimatePresence` de `framer-motion` (apenas neste arquivo, nao do projeto)

### Abordagem para ocultar texto no modo colapsado
Em vez de animacoes JS, usar a classe utilitaria do proprio sidebar do shadcn:
```
group-data-[collapsible=icon]:hidden
```
Isso ja e nativamente suportado pelo componente `Sidebar` quando `collapsible="icon"`.

### Estrutura final do NavItem
```text
NavLink
  +-- Icon (sempre visivel, centralizado quando colapsado)
  +-- span.label (hidden quando colapsado via CSS)
Tooltip (wraps NavLink quando colapsado)
```

### Estrutura do logo
```text
div.logo-container
  +-- img (simbolo) - visivel sempre, centralizado quando colapsado
  +-- img (logo completo) - visivel apenas quando expandido via CSS
```

O resultado sera uma sidebar que retrai e expande de forma fluida usando apenas CSS, sem flickering, sem delays de animacao JS, e mantendo todas as funcionalidades existentes (mobile sheet, tooltips, estados ativos, creditos, trial expired).
