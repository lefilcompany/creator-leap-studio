-- Permitir que admins de equipes vejam perfis de usuários com solicitações pendentes
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

-- Permitir que membros da mesma equipe vejam perfis uns dos outros
CREATE POLICY "Team members can view each other's profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  team_id IS NOT NULL 
  AND team_id IN (
    SELECT team_id 
    FROM public.profiles 
    WHERE id = auth.uid()
  )
);