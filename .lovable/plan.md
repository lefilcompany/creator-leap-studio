# Perfil Publico de Usuarios

## Resumo

Criar uma pagina de perfil publico (`/profile/:userId`) onde membros da mesma equipe podem visualizar informacoes nao sensiveis de outros usuarios. Alem disso, tornar os nomes de usuarios clicaveis em toda a plataforma (equipe, historico, etc.) para acessar esse perfil.

## O que sera exibido no perfil publico

- Banner personalizado do usuario (ou default)
- Foto de perfil com nome completo
- Email do usuário
- Estado e cidade (localizacao)
- Badge de administrador (se aplicavel)
- Data de entrada na equipe
- Informacoes **NAO** exibidas: telefone e senha (dados sensiveis)

## Etapas de implementacao

### 1. Criar a pagina `PublicProfile`

- Nova pagina em `src/pages/PublicProfile.tsx`
- Rota: `/profile/:userId`
- Layout similar ao Profile privado: banner no topo, card sobreposto com avatar e nome
- Busca dados do usuario via `profiles` table (campos: `name`, `avatar_url`, `banner_url`, `state`, `city`, `created_at`)
- Verificacao de acesso: apenas usuarios da mesma equipe podem visualizar
- Estado de carregamento com skeleton

### 2. Registrar a rota no App.tsx

- Adicionar rota `/profile/:userId` dentro do bloco de rotas protegidas do Dashboard
- Lazy load do componente `PublicProfile`

### 3. Criar componente reutilizavel `UserNameLink`

- Componente em `src/components/UserNameLink.tsx`
- Recebe `userId`, `userName` e opcionalmente `avatarUrl`
- Renderiza o nome como link clicavel (`/profile/:userId`)
- Estilo sutil: hover com underline e cor primary
- Se o userId for o proprio usuario logado, redireciona para `/profile` (perfil privado)

### 4. Integrar `UserNameLink` na pagina de Equipe

- Na grid view (cards de membros): nome do membro vira link clicavel
- Na list view: nome do membro vira link clicavel
- Nas solicitacoes pendentes: nome do solicitante vira link clicavel

### 5. Integrar `UserNameLink` no Historico e resultados de conteudo

- Onde o nome do criador de um conteudo aparece, tornar clicavel

## Detalhes tecnicos

### Seguranca e acesso

- A RLS policy existente `Authenticated users can view basic profiles` ja permite SELECT com `true`, entao qualquer usuario autenticado pode ler profiles. Isso e suficiente para o perfil publico.
- No frontend, a pagina filtra campos sensiveis e exibe apenas dados publicos (nome, avatar, banner, estado, cidade).
- Email e telefone NAO serao exibidos no perfil publico.

### Estrutura do componente PublicProfile

```text
+------------------------------------------+
|           BANNER (usuario)               |
+------------------------------------------+
|  [Avatar]  Nome do Usuario               |
|            Localizacao (Estado, Cidade)   |
|            Badge Admin (se aplicavel)     |
+------------------------------------------+
|                                          |
|  Card: Informacoes                       |
|  - Membro desde: data                   |
|  - Localizacao: Estado, Cidade           |
|  - Equipe: Nome da equipe               |
|                                          |
+------------------------------------------+
```

### Componente UserNameLink

```text
Props:
- userId: string
- userName: string
- className?: string

Comportamento:
- Renderiza <Link> para /profile/:userId
- Se userId === usuario logado -> /profile
- Estilo: hover:underline hover:text-primary cursor-pointer
```

### Arquivos a criar

- `src/pages/PublicProfile.tsx` - Pagina de perfil publico
- `src/components/UserNameLink.tsx` - Componente de link para nome

### Arquivos a modificar

- `src/App.tsx` - Adicionar rota `/profile/:userId`
- `src/pages/Team.tsx` - Usar UserNameLink nos nomes dos membros (grid e list view)