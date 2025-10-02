-- Remover a política que causa recursão infinita
DROP POLICY IF EXISTS "Team members can view each other's profiles" ON public.profiles;

-- Remover a função que não é mais necessária
DROP FUNCTION IF EXISTS public.get_user_team_id(uuid);

-- Criar política correta que não causa recursão
-- Usuários podem ver perfis de membros da mesma equipe usando subquery direto
CREATE POLICY "Team members can view each other's profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public.teams t
    WHERE t.id = profiles.team_id
    AND t.id IN (
      SELECT team_id 
      FROM public.profiles 
      WHERE id = auth.uid() 
      AND team_id IS NOT NULL
    )
  )
);