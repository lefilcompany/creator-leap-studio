-- Update can_access_resource to share resources between team members
-- Resources belong to user_id, but if users are in the same team, they share everything

CREATE OR REPLACE FUNCTION public.can_access_resource(resource_user_id uuid, resource_team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    -- User owns the resource directly
    resource_user_id = auth.uid()
    OR
    -- Resource owner is in the same team as current user (both must have a team)
    EXISTS (
      SELECT 1 
      FROM profiles p_current
      JOIN profiles p_owner ON p_current.team_id = p_owner.team_id
      WHERE p_current.id = auth.uid() 
        AND p_owner.id = resource_user_id
        AND p_current.team_id IS NOT NULL
    )
$$;