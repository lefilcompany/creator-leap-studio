
CREATE OR REPLACE FUNCTION public.remove_team_member(p_member_id uuid, p_team_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_team_name text;
  v_member_name text;
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

  -- Get team and member names for notification
  SELECT name INTO v_team_name FROM public.teams WHERE id = p_team_id;
  SELECT name INTO v_member_name FROM public.profiles WHERE id = p_member_id;

  -- Remove team_id from profile (credits remain untouched)
  UPDATE public.profiles
  SET team_id = NULL, updated_at = NOW()
  WHERE id = p_member_id AND team_id = p_team_id;

  -- Remove from team_members table
  DELETE FROM public.team_members
  WHERE user_id = p_member_id AND team_id = p_team_id;

  -- Notify the removed member
  INSERT INTO public.notifications (user_id, team_id, type, title, message, metadata)
  VALUES (
    p_member_id,
    p_team_id,
    'team_member_removed',
    'Você foi removido da equipe',
    'Você foi removido da equipe "' || v_team_name || '". Seus créditos pessoais foram mantidos e sua conta continua ativa.',
    jsonb_build_object('team_id', p_team_id, 'team_name', v_team_name, 'removed_by', auth.uid())
  );
END;
$$;
