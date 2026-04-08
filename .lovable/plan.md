

# Plano: Alinhar design da página `/result` com `/quick-content-result`

## Objetivo
Transformar o layout de `ContentResult.tsx` para seguir o mesmo padrão visual de `QuickContentResult.tsx`: banner com breadcrumb, header card com créditos, progress bar, two-column layout com imagem sticky à esquerda e informações à direita, incluindo a legenda no formato atual, e um collapsible "Configurações" com prompt, marca, plataforma e formato.

## Mudanças principais

### 1. Substituir o header atual por banner + breadcrumb + header card + progress bar
- Banner com `createBanner`, breadcrumb overlay ("Criar Conteúdo > Criação Personalizada > Resultado")
- Header card com ícone Sparkles, título "Criar Conteúdo", subtítulo, e badge de créditos (mesmo estilo gradient)
- Progress bar card com `CreationProgressBar currentStep="result"`

### 2. Coluna esquerda — Imagem (sticky)
- Card sem borda com `shadow-xl rounded-2xl`, imagem com `max-h-[80vh] object-contain`
- Hover overlay com botões "Ampliar" e "Download" (estilo `bg-white/90`)
- Barra de versões (revert) mantida abaixo da imagem quando há revisões

### 3. Coluna direita — Informações
- Título gradient "Conteúdo gerado com sucesso!"
- **Legenda** exibida da mesma forma atual: título em bold, body com line-clamp-3 e "Ler mais", hashtags com badges coloridos, botão copiar
- **Configurações (collapsible, retraído por padrão)**: prompt utilizado (com copiar), marca, plataforma, formato — usando badges com ícones
- Link "Reportar problema"
- Info de ação salva (se existir actionId)
- Botões de ação em grid 3 colunas: "Corrigir", "Criar outro" (dropdown), "Histórico"
- Botão "Salvar no Histórico" mantido quando não salvo

### 4. Modal de ampliar imagem
- Mesmo estilo glassmorphism do QuickContentResult: fundo `bg-black/95`, botões Download/Copiar/Fechar no canto superior direito com `backdrop-blur-md`

### 5. Importações adicionais
- Adicionar imports: `PageBreadcrumb`, `CreationProgressBar`, `Collapsible`, `createBanner`, `Maximize2`, `Pen`, `Plus`, `ChevronDown`, `X`, `Share2`, `Building2`, `Palette`, `User`, `Zap`

## Arquivos alterados
- `src/pages/ContentResult.tsx` — rewrite completo do layout (JSX de retorno), mantendo toda a lógica existente intacta

## Detalhes técnicos

```text
Layout Structure:
┌─────────────────────────────────────────┐
│ Banner + Breadcrumb (overlay)           │
├─────────────────────────────────────────┤
│ [Header Card + Credits] [Progress Bar]  │
├──────────────────┬──────────────────────┤
│                  │ "Conteúdo gerado     │
│   Imagem         │  com sucesso!"       │
│   (sticky)       │                      │
│                  │ [Legenda Card]        │
│   hover:         │   Título bold         │
│   Ampliar/DL     │   Body (clamp-3)     │
│                  │   #hashtags          │
│   [Versões]      │                      │
│                  │ ▸ Configurações       │
│                  │   Prompt, Marca...   │
│                  │                      │
│                  │ [Corrigir][Criar][Hist]│
└──────────────────┴──────────────────────┘
```

- A lógica de save to history, review (image/caption), version navigation permanece inalterada
- Apenas o JSX de renderização será reescrito para alinhar com o design de QuickContentResult

