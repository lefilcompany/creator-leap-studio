-- Create a security definer function to get user's team_id without RLS
CREATE OR REPLACE FUNCTION public.get_user_team_id(p_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT team_id FROM public.profiles WHERE id = p_user_id LIMIT 1;
$$;

-- Drop the potentially recursive policy
DROP POLICY IF EXISTS "Team members can view teammate profiles" ON public.profiles;

-- Recreate using the security definer function
CREATE POLICY "Team members can view teammate profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR (
    team_id IS NOT NULL
    AND team_id = public.get_user_team_id(auth.uid())
  )
);