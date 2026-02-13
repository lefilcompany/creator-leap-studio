

# Aplicar Estilo Padrao do Sistema na Tela ReviewContent

## Resumo
Reestruturar a pagina `/review` (ReviewContent) para seguir o mesmo padrao visual e arquitetural das demais paginas de criacao: banner ilustrativo full-bleed, breadcrumb overlay, header card sobreposto, cards sem bordas com sombra, layout `max-w-7xl`, e carregamento com React Query + Skeletons.

## Mudancas

### 1. Layout e Visual (`src/pages/ReviewContent.tsx`)

- Substituir o container atual (`div.h-full.w-full.flex.flex-col > div.max-w-7xl`) pelo container padrao com margens negativas (`-m-4 sm:-m-6 lg:-m-8 min-h-full`)
- Adicionar banner ilustrativo no topo usando `create-banner.jpg` (tematica de IA e criacao, coerente com revisao por IA)
- Mover breadcrumb para variante `overlay` sobre o banner: Home > "Revisar Conteudo"
- Adicionar header card sobreposto (`-mt-12`) com icone CheckCircle, titulo dinamico, descricao contextual e card de creditos (mesmo estilo do QuickContent)
- Remover o card header antigo com gradiente (`bg-gradient-to-r from-primary/5 via-secondary/5`)
- Atualizar todos os cards de formulario para `border-0 shadow-lg rounded-2xl` (removendo backdrop-blur, bordas e gradientes de header)
- Remover o spinner de loading bloqueante (`Loader2` fullscreen) e usar Skeletons nos selects

### 2. React Query para dados

- Substituir o carregamento manual (`useState` + `useEffect` + `loadData`) por `useQuery` com `staleTime: 5min` para brands e themes
- Usar as mesmas `queryKeys` (`['brands', teamId]`, `['themes', teamId]`) para compartilhar cache com outras paginas
- Remover os estados `isLoadingData`, `brands`, `themes` manuais
- Manter a logica de `filteredThemes` como derivacao computada

### 3. Estrutura do novo layout

```text
div.flex.flex-col.-m-4.sm:-m-6.lg:-m-8.min-h-full
  |-- OnboardingTour (mantido)
  |
  |-- div.relative.h-48.md:h-64.lg:h-72 (banner)
  |     |-- PageBreadcrumb variant="overlay" [Home > "Revisar Conteudo"]
  |     |-- img (create-banner.jpg)
  |     |-- div (gradient overlay from-background)
  |
  |-- div.relative.px-4.sm:px-6.lg:px-8.-mt-12.z-10 (header card)
  |     |-- div.max-w-7xl.mx-auto
  |           |-- div.bg-card.rounded-2xl.shadow-lg.p-4.md:p-6
  |                 |-- CheckCircle + Titulo + Descricao dinamica
  |                 |-- Card de creditos
  |
  |-- main.px-4.sm:px-6.lg:px-8.pt-4.pb-8.flex-1
        |-- div.max-w-7xl.mx-auto.space-y-4.mt-4
              |-- Card "Tipo de Revisao" (border-0 shadow-lg) - grid 3 colunas
              |-- Card "Configuracao Basica" (border-0 shadow-lg) - Marca + Tema
              |-- Card "Conteudo para Revisao" (border-0 shadow-lg) - campos dinamicos
              |-- Card "Acoes" (border-0 shadow-lg) - botoes
```

### 4. Detalhes tecnicos

**Importacoes adicionais:**
- `useQuery` de `@tanstack/react-query`
- `createBanner` de `@/assets/create-banner.jpg`
- `HelpCircle` de `lucide-react`
- `Popover`, `PopoverContent`, `PopoverTrigger` de `@/components/ui/popover`

**React Query:**
```text
useQuery(['brands', teamId], fetchBrands, { staleTime: 5min })
useQuery(['themes', teamId], fetchThemes, { staleTime: 5min })
```

**Cards atualizados:**
- Todos os cards passam de `backdrop-blur-sm bg-card/60 border border-border/20` para `border-0 shadow-lg rounded-2xl`
- Remover headers com gradiente interno (`bg-gradient-to-r from-primary/5`) nos cards de secao
- Manter titulos de secao com icone de bolinha colorida (`w-2 h-2 bg-primary rounded-full`)

### 5. Funcionalidade preservada
- Toda a logica de revisao (handleSubmit, review-image, review-caption, review-text-for-image) permanece intacta
- Selecao de tipo de revisao, upload de imagem, persistencia de formulario -- tudo mantido
- Tours de onboarding mantidos
- Apenas o layout/visual e o metodo de carregamento de dados serao alterados

### Arquivo modificado
- `src/pages/ReviewContent.tsx`

