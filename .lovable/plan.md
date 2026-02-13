
# Redesign da Tela "Criar Conteudo" com Identidade Visual do Sistema

## Resumo
Reestruturar a pagina `ContentCreationSelector` para seguir o mesmo padrao visual das paginas de Marcas, Temas e Personas: banner ilustrativo no topo com breadcrumb overlay, card de cabecalho sobreposto ao banner, e cards de selecao com o estilo visual limpo (border-0, shadow-lg) ja estabelecido no sistema.

## O que muda

### 1. Novo banner ilustrativo
- Criar uma imagem de banner dedicada para a pagina de criacao de conteudo (sera necessario adicionar `create-banner.jpg` aos assets ou reutilizar o `dashboard-banner.jpg` que ja tem o tema de criacao com IA e bonecos cartoon)
- Como a pagina nao possui um asset proprio e o `dashboard-banner.jpg` ja traz a identidade visual correta (bonecos cartoon, tema de criacao, paleta pastel), sera reutilizado como banner desta pagina
- Banner com `object-cover`, gradiente de fade para `background`, e breadcrumb overlay no canto superior esquerdo

### 2. Layout alinhado ao padrao (Banner + Header Card sobreposto)
- Container principal com margens negativas (`-m-4 sm:-m-6 lg:-m-8`) como Brands/Themes/Personas
- Banner no topo (h-48 md:h-56) com a imagem ilustrativa
- Card de cabecalho sobreposto ao banner (`-mt-12`) contendo:
  - Icone em container com fundo colorido (como Tag em Brands, Palette em Themes)
  - Titulo "Criar Conteudo" e descricao
  - Card de creditos do usuario (mantido do layout atual)

### 3. Cards de selecao com estilo padronizado
- Container dos cards com `border-0 shadow-lg rounded-2xl` (padrao visual-management-standard)
- Cards individuais com `border-0 shadow-md` e hover com `shadow-lg` e `border-primary`
- Manter o grid 2x2 com os 4 tipos de criacao
- Manter a funcionalidade de auto-navegacao ao clicar

## Detalhes tecnicos

### Arquivo a modificar
- `src/pages/ContentCreationSelector.tsx` - Reestruturar completamente o layout

### Estrutura do novo layout
```text
div.flex.flex-col.-m-4.sm:-m-6.lg:-m-8
  |-- div.relative (banner container)
  |     |-- PageBreadcrumb variant="overlay"
  |     |-- img (dashboard-banner.jpg)
  |     |-- div (gradient overlay)
  |
  |-- div.relative.px-4.-mt-12 (header card, sobrepondo banner)
  |     |-- Card (bg-card rounded-2xl shadow-lg)
  |           |-- Icone + Titulo + Descricao
  |           |-- Card de creditos
  |
  |-- main.px-4.pt-4.pb-8 (area de selecao)
        |-- Card (border-0 shadow-lg rounded-2xl)
              |-- CardHeader (com titulo "Tipo de Criacao")
              |-- CardContent (grid 2x2 com os 4 cards)
```

### Cards de tipo de criacao
- Manter a mesma logica de `RadioGroup` + auto-navegacao
- Estilizar com `border-0 shadow-md hover:shadow-lg hover:border-primary/50 transition-all`
- Manter badges de creditos com cores tematicas por tipo
- Card "Animar Imagem" continua desabilitado com `opacity-60`

### Importacoes adicionais
- `import dashboardBanner from '@/assets/dashboard-banner.jpg'` (reutilizando banner existente)
- HelpCircle e Popover para tooltip informativo (como nas outras paginas)
