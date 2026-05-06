
# Workspaces — Nova arquitetura colaborativa

Substituir o conceito atual de "equipe única por usuário" por **Workspaces**, mantendo todas as funcionalidades existentes (histórico, marcas, conteúdo) sob esse novo escopo. Cada usuário sempre terá ao menos 1 workspace pessoal; pode pertencer a vários workspaces; pode trocar entre eles por um seletor abaixo da logo.

## 1. Modelo de dados (migrações Test → Live no publish)

### Novas tabelas

- `workspaces` — `id`, `name`, `slug`, `owner_id`, `avatar_url`, `is_personal` (bool), `credit_mode` ('personal' | 'shared'), `shared_credits` (int, usado se shared), `created_at`, `updated_at`. Personal workspace é criado automaticamente no signup (trigger `handle_new_user`).
- `workspace_members` — `id`, `workspace_id`, `user_id` (nullable se ainda não cadastrado), `email` (para convite), `role` ('owner' | 'member'), `status` ('pending' | 'active'), `monthly_credit_limit` (nullable, só faz sentido em modo shared/doação), `credits_used_this_month` (int), `permissions` (jsonb: `{brands:{view,create,edit,delete}, content:{...}, history:{...}, calendars:{...}, personas:{...}, themes:{...}, members:{manage}, billing:{manage}}`), `invited_by`, `invited_at`, `joined_at`.
- `workspace_invites` — `id`, `workspace_id`, `email`, `token` (uuid único), `role`, `permissions`, `monthly_credit_limit`, `expires_at`, `accepted_at`, `invited_by`. Token enviado por e-mail com link `/invite/:token`.

### Alterações em tabelas existentes

Adicionar `workspace_id uuid` em todas as tabelas que hoje usam `team_id`:
`actions`, `brands`, `personas`, `strategic_themes`, `content_briefings`, `content_calendars`, `calendar_items`, `creation_feedback`, `agent_feedback`, `brand_style_preferences`, `custom_fonts`, `action_categories`, `action_favorites`, `notifications`, `text_style_templates`, `credit_history`, `credit_purchases`.

`team_id` é mantido temporariamente (deprecated, somente leitura). Toda escrita nova grava `workspace_id`. Hooks/edge functions são atualizados para preferir `workspace_id`; fallback lê `team_id` enquanto a base for migrada.

`profiles`: adicionar `current_workspace_id` (workspace ativo na sessão).

### RLS — função canônica

Substituir `can_access_resource(user_id, team_id)` por `can_access_workspace_resource(user_id, workspace_id, required_permission text)`. Implementação SECURITY DEFINER que verifica:
1. `user_id = auth.uid()`, OU
2. existe `workspace_members(workspace_id, user_id=auth.uid(), status='active')` E o `permissions->required_permission` é true.

Policies de cada tabela passam a usar essa função. A antiga `can_access_resource` é mantida por compatibilidade até a migração completa do código.

### Migração de dados (script numa migration)

Para cada `teams` existente:
1. Cria `workspaces` com `owner_id = teams.admin_id`, `is_personal=false`, `name=teams.name`, `credit_mode='personal'`.
2. Cria `workspace_members` para cada `profiles.team_id = teams.id` e cada `team_members.team_id`, com `role='owner'` para admin e `role='member'` para os demais; `permissions` padrão = todas marcadas (compatível com hoje).
3. Atualiza todas as tabelas com `team_id` setado, gravando `workspace_id` correspondente.
4. Para **todo** usuário em `profiles`, cria também 1 `workspaces is_personal=true` com `owner_id = profile.id`, `name = "<Primeiro nome>'s workspace"`, `credit_mode='personal'`.
5. Define `profiles.current_workspace_id` = workspace pessoal (default).

## 2. Backend / Edge functions

- `workspace-invite` — recebe `{workspace_id, email, role, permissions, monthly_credit_limit}`. Cria `workspace_invites`, dispara e-mail (template auth `invite-workspace`) com link `https://pla.creator.lefil.com.br/invite/<token>`.
- `workspace-accept-invite` — recebe `token`. Se usuário não existe → redireciona para `/register?invite=<token>` (Register grava `pending_invite_token` em metadata e processa pós-confirmação). Se existe → cria `workspace_members` ativo, marca invite `accepted_at`.
- `workspace-update-member` — atualizar role/permissions/limite por membro (apenas owner ou quem tem `members.manage`).
- `workspace-set-credit-mode` — alterar `credit_mode` (personal | shared); se shared, owner define `shared_credits` (transferência opcional do balance pessoal do owner para o pool — perguntar na UI).
- Atualizar **todas** as edge functions de geração de conteúdo para:
  - receber `workspace_id` no body,
  - debitar de `profiles.credits` se `credit_mode='personal'`, ou de `workspaces.shared_credits` se shared (e respeitar `monthly_credit_limit` por membro, atualizando `credits_used_this_month`).
  - gravar `workspace_id` em `actions`, `credit_history`, etc.

Job cron mensal para zerar `credits_used_this_month` em `workspace_members`.

## 3. Frontend

### Contexto e seletor

- Novo `WorkspaceContext` (`src/contexts/WorkspaceContext.tsx`) com `currentWorkspace`, `workspaces`, `members`, `setCurrentWorkspace()`, `permissions` (do membership ativo). Persiste `current_workspace_id` em `profiles`.
- `AppSidebar`: abaixo da logo, novo `WorkspaceSwitcher` (dropdown) inspirado no print enviado:
  - mostra avatar + nome do workspace atual + chevron;
  - ao abrir: cards com workspace atual (nome, plano, nº de membros, botões "Configurações" e "Convidar membros"), barra de créditos;
  - lista "Todos os workspaces" com badge (Pessoal / Pro), check no atual;
  - rodapé: "Criar novo workspace" + "Encontrar workspaces" (placeholder).

### Páginas

- `/workspace` (substitui `/team`) — gestão do workspace atual:
  - aba **Visão geral**: nome, avatar, plano, créditos (modo + saldo), botão configurar.
  - aba **Membros**: tabela inspirada no segundo print (Name, Role, Joined date, Usage do mês, Total usage, Credit limit, menu …). Botões "Invite link", "Invite members", "Export". Dropdown de role e ações de remover/transferir owner.
  - aba **Convites**: pendentes / reenviar / cancelar.
  - aba **Permissões**: por membro, modal com switches granulares por recurso (Marcas: ver/criar/editar/excluir; Conteúdo: ver/criar; Histórico: ver/excluir; Calendários; Personas; Temas; Membros: gerenciar; Billing: gerenciar).
  - aba **Créditos**: toggle Pessoal ↔ Compartilhado; se compartilhado, input `monthly_credit_limit` por membro.
- `/invite/:token` — aceitar convite (usuário logado: aceita; deslogado: redireciona pra `/register?invite=...`).
- Atualizar `Register` e `Login` para tratar `?invite=<token>`: ao concluir signup/login, chamar `workspace-accept-invite` automaticamente.

### Refactor abrangente

- Substituir todas as 60+ ocorrências de `team_id`/`teamId` em hooks (`useBrands`, `useActions`, `useThemes`, `usePersonas`, `useFavorites`, `useCalendars`, `useCustomFonts`, `useCategories`, `useCreditHistory`, `useTeamData`, `useTeamAccess`, `useHistoryActions`, `useTrash`) e nas páginas (`Dashboard`, `History`, `Brands`, `Personas`, `Themes`, `CreateContent`, `CreateImage`, `CreateVideo`, `QuickContent`, `PlanContent`, `ReviewContent`, `MarketplaceContent`, `BrandView`, `ActionView`, etc.) por `workspaceId` lido do `WorkspaceContext`.
- `AuthContext`: ao logar, carregar `current_workspace_id` e injetar no `WorkspaceProvider`.
- `useCreditsAction`: ler do workspace atual; se shared, validar `monthly_credit_limit` do membership.
- Esconder `/team` antigo (redirect → `/workspace`).
- `SystemTeams` admin → renomear para `SystemWorkspaces` (lista todos os workspaces).

### UI do switcher (seguindo prints)

- Botão pequeno com avatar quadrado colorido + nome.
- Dropdown 320px largura, fundo `bg-card`, `rounded-2xl`, divisórias sutis.
- Ícones de configurações (`Settings`) e convite (`UserPlus`).
- Barra de créditos com gradiente (`primary`).

## 4. E-mails (auth/transactional)

Configurar template transacional `workspace-invite` via infra de e-mails Lovable:
- assunto: "Você foi convidado para o workspace <nome> no Creator"
- corpo: nome do convidante, nome do workspace, botão "Aceitar convite" → link com token, validade 7 dias.

## 5. Memória do projeto

Atualizar `mem://index.md` Core: substituir "Team membership optional… `teammate_profiles`" por: "Workspaces obrigatórios; cada usuário tem 1 workspace pessoal + N compartilhados. `workspace_id` é o escopo canônico. `team_id` é legado/leitura."

Adicionar `mem://architecture/workspaces-model.md` com regras de credit_mode, permissions jsonb e fluxo de convite.

## 6. Ordem de implementação

1. Migração SQL: novas tabelas, colunas `workspace_id`, função RLS, policies, dados migrados.
2. Trigger `handle_new_user` → cria workspace pessoal.
3. `WorkspaceContext` + `WorkspaceSwitcher` no `AppSidebar`.
4. Página `/workspace` (Visão geral + Membros + Convites + Permissões + Créditos).
5. Edge functions de convite/aceite + templates de e-mail.
6. Refactor incremental de hooks/páginas: `team_id` → `workspace_id`, mantendo fallback de leitura para registros antigos durante 1 ciclo.
7. Atualizar edge functions de geração para usar `workspace_id` e respeitar credit_mode/limites.
8. Atualizar `SystemTeams` → `SystemWorkspaces`.
9. Atualizar memória.

## 7. Riscos / observações

- Refactor é grande (~70 arquivos); será feito em lotes coerentes para evitar quebra.
- Durante a migração, manter `team_id` populado em escritas novas (espelho) por segurança e remover no commit final.
- RLS recursivo: usar SECURITY DEFINER em `can_access_workspace_resource` para evitar loops via `workspace_members`.
- Créditos: alteração tem impacto em `useCreditsAction` e ~12 edge functions; testar individualmente.
