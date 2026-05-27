## Problema

Em produção, a equipe `LeFil Company` tem 21 membros no banco, mas a tela `/team` mostra apenas 1 (o próprio usuário). O mesmo ocorre em Test.

## Causa raiz

A view `public.teammate_profiles` foi criada com `security_invoker=true`. Isso faz com que a leitura respeite as RLS policies da tabela base `profiles`. As policies de SELECT em `profiles` em produção são apenas:

- `Users can view their own profile` — `auth.uid() = id`
- `System admins can view all profiles` — `has_role(auth.uid(), 'system')`

Não existe nenhuma policy que permita a um usuário enxergar os outros membros do seu próprio time. Resultado: ao consultar `teammate_profiles` filtrando por `team_id`, o usuário só recebe a própria linha.

Em Test há uma policy extra baseada em `workspace_members` (conceito antigo/diferente), que também não cobre o modelo atual de `team_id` em `profiles`, então o bug se reproduz em ambos os ambientes.

Bônus: a view `teammate_profiles` também está sem `GRANT SELECT` explícito em produção (já existe em Test via migração, mas em produção a tabela `pg_class` mostra a view sem privilégios).

## Correção

Migração única que:

1. Adiciona uma policy de SELECT em `public.profiles` permitindo que membros do mesmo time leiam as linhas uns dos outros, usando a função SECURITY DEFINER já existente `public.get_user_team_id(auth.uid())` para evitar recursão de RLS:

   ```sql
   CREATE POLICY "Teammates can view co-members profiles"
   ON public.profiles FOR SELECT
   TO authenticated
   USING (
     team_id IS NOT NULL
     AND team_id = public.get_user_team_id(auth.uid())
   );
   ```

2. Reafirma os GRANTs da view (idempotente, cobre o caso de produção sem grants):

   ```sql
   GRANT SELECT ON public.teammate_profiles TO authenticated;
   ```
   (Sem grant para `anon` — leitura de teammates é auth-only.)

3. Remove a policy obsoleta `Workspace members can view co-members profiles` em Test, que referencia a tabela antiga `workspace_members` e não tem efeito útil hoje.

## Por que essa policy é segura

- A view `teammate_profiles` já restringe colunas a campos não-sensíveis (id, name, email, avatar_url, banner_url, team_id, created_at, tutorial_completed, phone, city, state). Senhas/tokens não estão na tabela `profiles`.
- A nova policy concede leitura apenas a linhas com o mesmo `team_id` do usuário autenticado. Usuários sem time (`team_id IS NULL`) continuam só vendo o próprio perfil.
- A função `get_user_team_id` é SECURITY DEFINER, então não há recursão de RLS ao avaliar a policy.

## Verificação após publicar

- Logar com um membro do LeFil Company em produção e abrir `/team` — deve listar os 21 membros.
- Conferir que um usuário sem time continua enxergando só o próprio perfil em outras telas que usam `profiles`.

## Sem mudanças de frontend

`useTeamMembers` já consulta `teammate_profiles` filtrando por `team_id`; nenhuma alteração de código React é necessária.