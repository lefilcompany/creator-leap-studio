
-- 1. Normaliza todos os membros não-donos para 'member'
UPDATE public.workspace_members
SET role = 'member'
WHERE role <> 'owner';

-- 2. Restringe constraint a apenas owner | member
ALTER TABLE public.workspace_members
  DROP CONSTRAINT IF EXISTS workspace_members_role_check;

ALTER TABLE public.workspace_members
  ADD CONSTRAINT workspace_members_role_check
  CHECK (role IN ('owner', 'member'));

-- 3. Remove políticas RESTRICTIVE que bloqueavam viewer em todas as tabelas
DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'brands','actions','personas','content_calendars','calendar_items',
      'content_briefings','action_categories','action_favorites',
      'brand_style_preferences','creation_feedback','agent_feedback','custom_fonts'
    ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "Workspace viewers blocked from writes" ON public.%I', t);
  END LOOP;
END $$;

-- 4. Simplifica workspace_has_permission: qualquer membro ativo pode tudo
CREATE OR REPLACE FUNCTION public.workspace_has_permission(
  _workspace_id uuid,
  _user_id uuid,
  _path text
)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = _workspace_id
      AND user_id = _user_id
      AND status = 'active'
  );
$$;
