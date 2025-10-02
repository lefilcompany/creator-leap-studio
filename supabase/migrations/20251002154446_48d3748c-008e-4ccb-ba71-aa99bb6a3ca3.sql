-- Remover as políticas que causam recursão infinita
DROP POLICY IF EXISTS "Team admins can view profiles of users with pending join requests" ON public.profiles;
DROP POLICY IF EXISTS "Team members can view each other's profiles" ON public.profiles;

-- Criar função SECURITY DEFINER para obter team_id do usuário atual sem recursão
CREATE OR REPLACE FUNCTION public.get_user_team_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT team_id FROM public.profiles WHERE id = _user_id LIMIT 1;
$$;

-- Política correta: Admins podem ver perfis de usuários com solicitações pendentes
CREATE POLICY "Team admins can view profiles of users with pending join requests"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT tjr.user_id
    FROM public.team_join_requests tjr
    INNER JOIN public.teams t ON tjr.team_id = t.id
    WHERE t.admin_id = auth.uid()
    AND tjr.status = 'pending'
  )
);

-- Política correta: Membros da mesma equipe podem ver perfis uns dos outros
CREATE POLICY "Team members can view each other's profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  team_id IS NOT NULL 
  AND team_id = public.get_user_team_id(auth.uid())
);