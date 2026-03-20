
CREATE OR REPLACE FUNCTION public.remove_team_member(p_member_id uuid, p_team_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only the team admin can remove members
  IF NOT EXISTS (
    SELECT 1 FROM public.teams
    WHERE id = p_team_id AND admin_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Only the team admin can remove members';
  END IF;

  -- Cannot remove yourself
  IF p_member_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot remove yourself from the team';
  END IF;

  -- Verify the member belongs to this team
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_member_id AND team_id = p_team_id
  ) THEN
    RAISE EXCEPTION 'Member does not belong to this team';
  END IF;

  -- Remove team_id from profile
  UPDATE public.profiles
  SET team_id = NULL, updated_at = NOW()
  WHERE id = p_member_id AND team_id = p_team_id;

  -- Remove from team_members table
  DELETE FROM public.team_members
  WHERE user_id = p_member_id AND team_id = p_team_id;
END;
$$;
