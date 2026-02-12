

## Redesign da Tela de Equipe para Seguir o Padrao Visual de Marcas/Personas/Temas

### Problema Atual
A tela de Equipe (`/team`) utiliza um layout antigo com Cards empilhados, PageBreadcrumb e gradientes sutis. As telas de Marcas, Personas e Temas seguem um padrao visual moderno com:
- Banner de imagem no topo (full-width)
- Card header sobreposto ao banner com icone grande, titulo e botoes de acao
- Layout sem margens (`-m-4 sm:-m-6 lg:-m-8`)
- Sem breadcrumb (o banner substitui)

### Solucao
Refatorar a tela de Equipe para adotar o mesmo padrao visual, mantendo toda a funcionalidade existente (tabs, membros, solicitacoes, conteudo compartilhado, seletor de equipes, dialogs).

### Arquivo alterado
`src/pages/Team.tsx`

### Alteracoes detalhadas

**1. Remover PageBreadcrumb e adotar layout full-bleed**
- Trocar `<div className="min-h-full space-y-6">` por `<div className="flex flex-col -m-4 sm:-m-6 lg:-m-8">`
- Remover import e uso do `PageBreadcrumb`

**2. Adicionar banner de imagem**
- Reutilizar o banner do dashboard (`dashboard-banner.jpg`) como imagem de fundo, ja que nao existe um banner especifico para equipes
- Usar o mesmo padrao: `h-48 md:h-56`, gradiente overlay `from-background/80`

**3. Substituir header Card por card sobreposto ao banner**
- Usar o padrao `-mt-12` com `bg-card rounded-2xl shadow-lg p-4 lg:p-5`
- Icone `UsersRound` em container `bg-primary/10 border border-primary/20 rounded-2xl`
- Titulo "Equipes" com descricao
- Botoes "Nova Equipe" e "Entrar em Equipe" alinhados a direita

**4. Mover conteudo para area principal**
- Seletor de equipes, info da equipe e tabs ficam dentro de `<main className="px-4 sm:px-6 lg:px-8 pt-4 pb-4 sm:pb-6 lg:pb-8">`
- Manter toda a logica existente de tabs, membros, solicitacoes, conteudo compartilhado

**5. Adaptar estados vazios e skeleton**
- Skeleton segue o mesmo padrao (banner + card sobreposto)
- Estado "sem equipe" mantem o layout com banner e card sobreposto, com os botoes de acao no card

### O que permanece identico
- Toda a logica de dados (loadAccessibleTeams, loadTeamContent, loadTeamManagementData)
- Sistema de tabs (Marcas, Personas, Temas, Criacoes, Membros)
- Gestao de membros (aprovar, rejeitar, remover)
- Seletor de equipes multiplas
- Dialogs de criar/entrar em equipe
- Codigo de convite com copia
- Paginacao de membros

### Secao tecnica

Estrutura HTML resultante:
```text
div.flex.flex-col.-m-4.sm:-m-6.lg:-m-8
  |-- div.relative (banner image + gradient overlay)
  |-- div.relative.px-4.-mt-12 (header card sobreposto)
  |     |-- div.bg-card.rounded-2xl.shadow-lg (icone + titulo + botoes)
  |-- main.px-4.pt-4.pb-4 (conteudo)
        |-- seletor de equipes (se > 1)
        |-- info da equipe selecionada
        |-- tabs com todo o conteudo
  |-- Dialogs (CreateTeam, JoinTeam)
```

Imports a adicionar: `import dashboardBanner from '@/assets/dashboard-banner.jpg'`
Imports a remover: `PageBreadcrumb`, `Card/CardHeader/CardTitle` (parcial - ainda usado nas tabs internas)

