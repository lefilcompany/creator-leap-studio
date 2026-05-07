
-- 1. Expand allowed roles. Existing 'member' rows stay valid (treated as 'editor' by default).
ALTER TABLE public.workspace_members
  DROP CONSTRAINT IF EXISTS workspace_members_role_check;

ALTER TABLE public.workspace_members
  ADD CONSTRAINT workspace_members_role_check
  CHECK (role IN ('owner', 'admin', 'editor', 'viewer', 'member'));

-- 2. Helper: get user's role in a workspace (NULL if not active member)
CREATE OR REPLACE FUNCTION public.get_workspace_role(_workspace_id uuid, _user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.workspace_members
  WHERE workspace_id = _workspace_id
    AND user_id = _user_id
    AND status = 'active'
  LIMIT 1
$$;

-- 3. Helper: granular permission check.
-- Resolution order:
--   * owner / admin => true for everything
--   * viewer => true only for *.view paths
--   * editor / member => true for everything EXCEPT members.* and billing.*
--   * if a custom permissions JSON exists, the leaf value overrides the default
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
  v_leaf boolean;
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
  ELSE
    -- editor / member
    v_default := (v_section NOT IN ('members', 'billing'));
  END IF;

  -- Custom permissions override
  IF v_perms IS NOT NULL THEN
    v_cur := v_perms;
    FOREACH v_section IN ARRAY v_parts LOOP
      IF v_cur IS NULL THEN EXIT; END IF;
      v_cur := v_cur -> v_section;
    END LOOP;
    IF jsonb_typeof(v_cur) = 'boolean' THEN
      v_leaf := (v_cur)::text::boolean;
      RETURN v_leaf;
    END IF;
  END IF;

  RETURN v_default;
END;
$$;

REVOKE ALL ON FUNCTION public.get_workspace_role(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.workspace_has_permission(uuid, uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_workspace_role(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.workspace_has_permission(uuid, uuid, text) TO authenticated, service_role;

-- 4. Tighten RLS: viewers cannot insert/update/delete in core resource tables.
-- We add stricter policies layered on top of existing "is_workspace_member" ones.
-- Existing SELECT policies remain unchanged (viewers can read).

-- Helper-style WHERE clauses per resource:
--   INSERT/UPDATE/DELETE require role IN ('owner','admin','editor','member')
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'brands', 'actions', 'personas', 'content_calendars', 'calendar_items',
    'content_briefings', 'action_categories', 'action_favorites',
    'brand_style_preferences', 'creation_feedback', 'agent_feedback', 'custom_fonts'
  ]) LOOP
    EXECUTE format($f$
      DROP POLICY IF EXISTS "Workspace viewers blocked from writes" ON public.%I;
    $f$, t);
    EXECUTE format($f$
      CREATE POLICY "Workspace viewers blocked from writes" ON public.%I
      AS RESTRICTIVE
      FOR ALL
      TO authenticated
      USING (
        workspace_id IS NULL
        OR public.get_workspace_role(workspace_id, auth.uid()) IS DISTINCT FROM 'viewer'
      )
      WITH CHECK (
        workspace_id IS NULL
        OR public.get_workspace_role(workspace_id, auth.uid()) IS DISTINCT FROM 'viewer'
      );
    $f$, t);
  END LOOP;
END $$;
