

# Plano: Redesign das Telas de Resultado de Geração de Imagem

## Resumo

Reformular as páginas `ContentResult.tsx` e `QuickContentResult.tsx` para melhorar a experiência de visualização da imagem e interação com legendas/prompts, seguindo o layout da referência (imagem à esquerda, informações à direita).

---

## Mudanças Principais

### 1. Layout da Imagem sem Scroll

**Ambas as páginas**: A imagem gerada será exibida em tamanho completo sem scroll interno, usando `object-contain` com altura máxima controlada (`max-h-[80vh]`) e sem `aspect-ratio` forçado, permitindo que a proporção real da imagem determine o espaço. No desktop, layout de 2 colunas (imagem esquerda sticky, conteúdo direita).

### 2. ContentResult — Legenda Truncada com "Ler mais"

- Adicionar estado `isExpanded` para controlar a exibição da legenda
- Por padrão, truncar o corpo da legenda em 3 linhas usando `line-clamp-3`
- Botão "Ler mais" que expande para mostrar o texto completo
- Quando expandido, botão muda para "Ler menos"
- Título e hashtags sempre visíveis; apenas o corpo é truncado

### 3. QuickContentResult — Prompt Truncado + Copiar + Reusar

- **Prompt truncado**: Exibir o prompt usado com `line-clamp-3` e botão "Ler mais"
- **Botão Copiar com transição de check**: Ícone de cópia que ao clicar muda para check verde com animação smooth, volta ao normal após 2s (já existe parcialmente, mas será refinado com transição CSS)
- **Botão "Criar nova com mesmo prompt"**: 
  - Navega para `/quick-content` passando `location.state` com os dados do formulário pré-preenchidos (`prompt`, `brandId`, `themeId`, `personaId`, `platform`, `aspectRatio`, `visualStyle`, etc.)
  - Na página `QuickContent.tsx`, adicionar lógica no `useEffect` para ler `location.state` e preencher os campos
  - Exibir um `Alert` de aviso: "Os campos foram preenchidos com base na sua criação anterior. Anexe novamente as imagens de referência, caso tenha utilizado."

### 4. Botões de Ação (baseado na referência)

Ambas as páginas terão 3 botões de ação proeminentes no rodapé:
- **Corrigir** (revisão de imagem/legenda) — cor primária/rosa
- **Gerar outra** (navega para tela de criação) — cor secundária
- **Histórico** (navega para `/history`) — cor destaque

---

## Arquivos Modificados

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/ContentResult.tsx` | Refatorar layout imagem sem scroll, legenda truncada com "ler mais", botões de ação redesenhados |
| `src/pages/QuickContentResult.tsx` | Prompt truncado com "ler mais", copiar com transição check, botão reusar prompt, layout sem scroll na imagem |
| `src/pages/QuickContent.tsx` | Receber `location.state` para pré-preencher formulário, exibir alerta sobre imagens de referência |

---

## Detalhes Técnicos

### Truncamento com "Ler mais"
```text
Estado: isExpanded (boolean)
Classe CSS: line-clamp-3 quando não expandido
Botão: text button "Ler mais" / "Ler menos"
```

### Botão Copiar com transição
```text
Estado: isCopied (boolean)
Transição: ícone Copy → Check com scale animation
Classes: transition-all duration-300
Timeout: 2 segundos para reset
```

### Pré-preenchimento do QuickContent
```text
location.state?.prefillData contém:
  - prompt, brandId, themeId, personaId
  - platform, aspectRatio, visualStyle
  - showPrefillWarning: true

QuickContent.tsx useEffect:
  if (location.state?.prefillData) {
    setFormData(prev => ({ ...prev, ...location.state.prefillData }))
    // Mostrar alerta sobre imagens
  }
```

### Imagem sem scroll
```text
Container: relative, sem aspect-ratio forçado
Imagem: w-full, max-h-[80vh], object-contain
Sem overflow-hidden no container vertical
```

