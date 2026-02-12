

# Breadcrumb sobre o Banner + Remover botoes "Voltar"

## Resumo
Remover os botoes "Voltar" da pagina PublicProfile e adicionar o componente `PageBreadcrumb` sobreposto no canto superior esquerdo do banner em todas as paginas que possuem banner. Para paginas sem banner, adicionar breadcrumb normalmente onde ainda nao existe. O Dashboard (home) nao recebera breadcrumb.

## Paginas com banner (breadcrumb sobreposto no banner)
Estas paginas possuem um banner ilustrativo no topo. O breadcrumb sera posicionado com `absolute` dentro do container do banner, no canto superior esquerdo, com texto claro (branco com leve sombra) para contraste contra a imagem.

1. **PublicProfile** (`/profile/:userId`) - Remover botoes "Voltar" (desktop e mobile), adicionar breadcrumb no banner: `Home > Equipe > Nome do Usuario`
2. **Profile** (`/profile`) - Adicionar breadcrumb no banner: `Home > Meu Perfil`
3. **Team** (`/team`) - Adicionar breadcrumb no banner: `Home > Equipe`
4. **Brands** (`/brands`) - Ja possui breadcrumb abaixo do banner, mover para dentro do banner
5. **Themes** (`/themes`) - Ja possui breadcrumb abaixo do banner, mover para dentro do banner
6. **Personas** (`/personas`) - Ja possui breadcrumb abaixo do banner, mover para dentro do banner
7. **History** (`/history`) - Adicionar breadcrumb no banner: `Home > Historico`

## Paginas sem banner (breadcrumb normal, ja existente)
Estas paginas ja possuem breadcrumb e nao precisam de alteracoes:
- Credits, Plans, CreateImage, CreateVideo, QuickContent, PlanContent, ReviewContent, AnimateImage, ContentCreationSelector, ActionView, BrandView, ThemeView, PersonaView, QuickContentResult

## Paginas sem breadcrumb a adicionar
- **CreditHistory** - Adicionar breadcrumb: `Home > Historico de Creditos`
- **TeamDashboard** - Adicionar breadcrumb: `Home > Equipe > Dashboard`

## Detalhes tecnicos

### Estilo do breadcrumb sobre o banner
O breadcrumb sera posicionado dentro do container `relative` do banner com classes:
```text
absolute top-4 left-4 sm:left-6 lg:left-8 z-10
```
Os textos e icones usarao cores claras para contraste contra a imagem do banner:
```text
[&_*]:text-white/90 [&_*]:drop-shadow-md
```
O icone Home e os separadores tambem serao brancos com sombra para garantir legibilidade.

### Alteracoes no PageBreadcrumb
Adicionar uma prop `variant` opcional (`default` | `overlay`) ao componente `PageBreadcrumb` para aplicar estilos de sobreposicao (texto branco com sombra) automaticamente quando usado sobre banners.

### Arquivos a modificar
- `src/components/PageBreadcrumb.tsx` - Adicionar variante `overlay`
- `src/pages/PublicProfile.tsx` - Remover botoes Voltar, adicionar breadcrumb overlay no banner
- `src/pages/Profile.tsx` - Adicionar breadcrumb overlay no banner
- `src/pages/Team.tsx` - Adicionar breadcrumb overlay no banner
- `src/pages/Brands.tsx` - Mover breadcrumb para dentro do banner com overlay
- `src/pages/Themes.tsx` - Mover breadcrumb para dentro do banner com overlay
- `src/pages/Personas.tsx` - Mover breadcrumb para dentro do banner com overlay
- `src/pages/History.tsx` - Adicionar breadcrumb overlay no banner
- `src/pages/CreditHistory.tsx` - Adicionar breadcrumb normal
- `src/pages/TeamDashboard.tsx` - Adicionar breadcrumb normal

