

# Melhoria da Tela de Criacao Rapida (/quick-content)

## Resumo
Reestruturar a pagina QuickContent para (1) carregar dados instantaneamente com cache React Query, (2) aplicar a identidade visual padrao com banner + header card sobreposto, (3) usar Skeletons em vez de spinner bloqueante, e (4) ampliar o layout para ocupar melhor telas grandes.

## Mudancas

### 1. Carregamento rapido com React Query
- Substituir o carregamento manual (`useState` + `useEffect` + `loadData`) por queries React Query com `staleTime: 5min`
- Marcas, Temas e Personas serao cacheados e compartilhados entre paginas (mesmas queryKeys ja usadas em Brands, Themes, Personas)
- Resultado: segunda visita a pagina carrega instantaneamente

### 2. Layout com identidade visual (Banner + Header Card)
- Adicionar banner ilustrativo no topo remetendo a criacao rapida de conteudo com IA (gerar imagem dedicada ou reutilizar `create-banner.jpg` ja existente)
- Breadcrumb overlay sobre o banner
- Header card sobreposto ao banner (`-mt-12`) com icone, titulo, descricao e card de creditos
- Container principal com margens negativas (`-m-4 sm:-m-6 lg:-m-8`) como nas outras paginas

### 3. Skeleton loading em vez de spinner
- Substituir o spinner bloqueante (`loadingData ? <Loader2>`) por Skeletons nos campos de formulario
- Os campos de prompt, estilo visual e imagens de referencia renderizam imediatamente
- Apenas os selects de Marca, Tema, Persona mostram Skeleton enquanto carregam

### 4. Layout mais amplo para desktop
- Mudar de `max-w-4xl` para `max-w-7xl` para reduzir o espaco lateral em telas grandes
- O grid de "Contexto Criativo" (2x2) e campos ocuparao melhor o espaco disponivel
- Manter responsividade em telas menores

## Detalhes tecnicos

### Arquivo a modificar
- `src/pages/QuickContent.tsx` - Reestruturar layout e substituir carregamento manual por React Query

### Estrutura do novo layout
```text
div.flex.flex-col.-m-4.sm:-m-6.lg:-m-8
  |-- div.relative (banner h-48 md:h-56)
  |     |-- PageBreadcrumb variant="overlay"
  |     |-- img (create-banner.jpg)
  |     |-- div (gradient overlay)
  |
  |-- div.relative.px-4.-mt-12 (header card)
  |     |-- div.bg-card.rounded-2xl.shadow-lg
  |           |-- Icone Zap + Titulo + Descricao + HelpCircle
  |           |-- Card de creditos
  |
  |-- main.px-4.pt-4.pb-8 (formulario)
        |-- div.max-w-7xl.mx-auto.space-y-4
              |-- CreationProgressBar
              |-- Cards de formulario (prompt, contexto, estilo, ref images, advanced)
              |-- Botao Gerar
```

### React Query - Queries com cache
```text
useQuery(['quick-content-brands', teamId/userId])  -> staleTime: 5min
useQuery(['quick-content-themes', teamId/userId])   -> staleTime: 5min
useQuery(['quick-content-personas', teamId/userId]) -> staleTime: 5min
```

As queries serao feitas em paralelo (Promise.all implicitamente pelo React Query) e os selects mostrarao Skeleton durante o carregamento.

### Importacoes adicionais
- `useQuery` de `@tanstack/react-query`
- `Skeleton` de `@/components/ui/skeleton`
- `HelpCircle` e `Popover/PopoverContent/PopoverTrigger` (ja importados parcialmente)
- `createBanner` de `@/assets/create-banner.jpg` (reutilizar banner ja criado)

### Hierarquia dos campos preservada
A ordem dos campos permanece identica:
1. Prompt (descricao do que criar)
2. Contexto Criativo (Marca, Persona, Tema, Plataforma)
3. Estilo Visual
4. Imagens de Referencia
5. Opcoes Avancadas (Accordion)
6. Botao Gerar
