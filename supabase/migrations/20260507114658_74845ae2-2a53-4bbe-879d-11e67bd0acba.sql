
ALTER TABLE public.workspace_members
  DROP CONSTRAINT IF EXISTS workspace_members_role_check;

ALTER TABLE public.workspace_members
  ADD CONSTRAINT workspace_members_role_check
  CHECK (role IN ('owner', 'admin', 'editor', 'viewer', 'custom', 'member'));

CREATE OR REPLACE FUNCTION public.workspace_has_permission(
  _workspace_id uuid,
  _user_id uuid,
  _path text
)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text;
  v_perms jsonb;
  v_parts text[];
  v_cur jsonb;
  v_default boolean;
  v_section text;
  v_action text;
BEGIN
  SELECT role, permissions
    INTO v_role, v_perms
  FROM public.workspace_members
  WHERE workspace_id = _workspace_id
    AND user_id = _user_id
    AND status = 'active'
  LIMIT 1;

  IF v_role IS NULL THEN RETURN false; END IF;
  IF v_role IN ('owner', 'admin') THEN RETURN true; END IF;

  v_parts := string_to_array(_path, '.');
  IF array_length(v_parts, 1) < 1 THEN RETURN false; END IF;
  v_section := v_parts[1];
  v_action := COALESCE(v_parts[2], 'view');

  -- Compute role default
  IF v_role = 'viewer' THEN
    v_default := (v_action = 'view');
  ELSIF v_role = 'custom' THEN
    v_default := false; -- custom relies entirely on the JSON permissions
  ELSE
    -- editor / member
    v_default := (v_section NOT IN ('members', 'billing'));
  END IF;

  -- Custom permissions override
  IF v_perms IS NOT NULL THEN
    v_cur := v_perms;
    FOR i IN 1..array_length(v_parts, 1) LOOP
      IF v_cur IS NULL THEN EXIT; END IF;
      v_cur := v_cur -> v_parts[i];
    END LOOP;
    IF jsonb_typeof(v_cur) = 'boolean' THEN
      RETURN (v_cur)::text::boolean;
    END IF;
  END IF;

  RETURN v_default;
END;
$$;
