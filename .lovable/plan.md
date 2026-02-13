

# Aplicar Estilo Padrao do Sistema nas Telas CreateImage e CreateVideo

## Resumo
Reestruturar as paginas `/create/image` (CreateImage) e `/create/video` (CreateVideo) para seguir o mesmo padrao visual e arquitetural ja estabelecido na pagina `/quick-content` (QuickContent): banner ilustrativo full-bleed, breadcrumb overlay, header card sobreposto, cards sem bordas com sombra, layout `max-w-7xl`, e carregamento com React Query + Skeletons.

## Mudancas

### 1. CreateImage (`src/pages/CreateImage.tsx`)

**Layout e Visual:**
- Remover fundo gradiente (`bg-gradient-to-br from-pink-50/50...`) e substituir pelo container padrao (`-m-4 sm:-m-6 lg:-m-8`)
- Adicionar banner ilustrativo no topo (`create-banner.jpg`) com `h-48 md:h-64 lg:h-72`
- Mover breadcrumb para variante `overlay` sobre o banner, com caminho: "Criar Conteudo" (link para /create) > "Criar Imagem"
- Adicionar header card sobreposto (`-mt-12`) com icone ImageIcon, titulo, descricao e card de creditos (mesmo estilo do QuickContent)
- Expandir layout de `max-w-5xl` para `max-w-7xl`
- Atualizar cards de formulario para `border-0 shadow-lg rounded-2xl` (removendo bordas purple customizadas)
- Adicionar `CreationProgressBar` no topo do formulario
- Remover spinner de loading bloqueante e usar Skeletons nos campos

**Carregamento com React Query:**
- Substituir o carregamento manual (`useState` + `useEffect` + `loadData`) por queries React Query com `staleTime: 5min` para brands, themes e personas
- Manter a logica de `team` como query separada
- Remover os estados `isLoadingData`, `brands`, `themes`, `personas` manuais

### 2. CreateVideo (`src/pages/CreateVideo.tsx`)

**Layout e Visual:**
- Mesmas mudancas de layout que CreateImage: container `-m-4`, banner, breadcrumb overlay, header card sobreposto
- Breadcrumb: "Criar Conteudo" (link para /create) > "Criar Video"
- Icone do header: Video (ja importado)
- Expandir layout de `max-w-4xl` para `max-w-7xl`
- Atualizar cards de formulario para `border-0 shadow-lg rounded-2xl`
- Remover estilo purple customizado dos selects e cards
- Remover spinner de loading bloqueante e usar Skeletons

**Carregamento com React Query:**
- Substituir carregamento manual por React Query (mesma abordagem que CreateImage)
- Queries para brands, themes, personas com `staleTime: 5min`

## Detalhes tecnicos

### Estrutura do novo layout (aplicada a ambas as paginas)

```text
div.flex.flex-col.-m-4.sm:-m-6.lg:-m-8.min-h-full
  |-- TourSelector (mantido)
  |
  |-- div.relative.h-48.md:h-64.lg:h-72 (banner)
  |     |-- PageBreadcrumb variant="overlay"
  |     |-- img (create-banner.jpg)
  |     |-- div (gradient overlay from-background)
  |
  |-- div.relative.px-4.sm:px-6.lg:px-8.-mt-12.z-10 (header card)
  |     |-- div.max-w-7xl.mx-auto
  |           |-- div.bg-card.rounded-2xl.shadow-lg.p-4.md:p-6
  |                 |-- Icone + Titulo + Descricao
  |                 |-- Card de creditos
  |
  |-- main.px-4.sm:px-6.lg:px-8.pt-4.pb-8.flex-1
        |-- div.max-w-7xl.mx-auto.space-y-4.mt-4
              |-- CreationProgressBar
              |-- Cards de formulario (border-0 shadow-lg)
              |-- Botao Gerar
```

### React Query - Substituicao do carregamento manual

Em ambas as paginas, trocar:
```text
useState + useEffect + loadData + Promise.all
```
Por:
```text
useQuery(['brands', teamId], fetchBrands, { staleTime: 5min })
useQuery(['themes', teamId], fetchThemes, { staleTime: 5min })
useQuery(['personas', teamId], fetchPersonas, { staleTime: 5min })
```

As queryKeys serao as mesmas ja usadas no QuickContent (`['brands', teamId]`, etc.), garantindo cache compartilhado entre paginas.

### Importacoes adicionais em ambas as paginas
- `useQuery` de `@tanstack/react-query`
- `CreationProgressBar` de `@/components/CreationProgressBar`
- `createBanner` de `@/assets/create-banner.jpg`
- `HelpCircle` de `lucide-react`
- `Popover`, `PopoverContent`, `PopoverTrigger` de `@/components/ui/popover`

### Funcionalidade preservada
- Toda a logica de geracao de conteudo (handleGenerateContent, handleGenerateVideo) permanece intacta
- Validacao de formularios, upload de imagens, compressao, tone selection -- tudo mantido
- Apenas o layout/visual e o metodo de carregamento de dados serao alterados

### Arquivos modificados
- `src/pages/CreateImage.tsx` - Layout + React Query
- `src/pages/CreateVideo.tsx` - Layout + React Query

