-- Allow teammates to view co-members profiles (filtered via teammate_profiles view)
DROP POLICY IF EXISTS "Workspace members can view co-members profiles" ON public.profiles;
DROP POLICY IF EXISTS "Teammates can view co-members profiles" ON public.profiles;

CREATE POLICY "Teammates can view co-members profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  team_id IS NOT NULL
  AND team_id = public.get_user_team_id(auth.uid())
);

-- Ensure the view is reachable through the Data API
GRANT SELECT ON public.teammate_profiles TO authenticated;