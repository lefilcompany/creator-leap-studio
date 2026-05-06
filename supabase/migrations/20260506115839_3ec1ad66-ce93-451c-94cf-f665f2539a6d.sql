
-- Update can_access_resource to also consider workspace membership
CREATE OR REPLACE FUNCTION public.can_access_resource(resource_user_id uuid, resource_team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    resource_user_id = auth.uid()
    OR (
      resource_team_id IS NOT NULL
      AND resource_team_id = (SELECT team_id FROM profiles WHERE id = auth.uid())
    )
$function$;

-- Add workspace-aware policies for major tables (additive; existing policies remain).
-- These allow access when the current user is a member of the resource's workspace.

DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'brands','personas','strategic_themes','actions','content_calendars','calendar_items',
    'content_briefings','custom_fonts','agent_feedback','creation_feedback',
    'brand_style_preferences','action_favorites','action_categories'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format($f$
      DROP POLICY IF EXISTS "Workspace members can view %1$s" ON public.%1$I;
      CREATE POLICY "Workspace members can view %1$s" ON public.%1$I
        FOR SELECT USING (
          workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id, auth.uid())
        );
      DROP POLICY IF EXISTS "Workspace members can update %1$s" ON public.%1$I;
      CREATE POLICY "Workspace members can update %1$s" ON public.%1$I
        FOR UPDATE USING (
          workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id, auth.uid())
        );
      DROP POLICY IF EXISTS "Workspace members can delete %1$s" ON public.%1$I;
      CREATE POLICY "Workspace members can delete %1$s" ON public.%1$I
        FOR DELETE USING (
          workspace_id IS NOT NULL AND public.is_workspace_member(workspace_id, auth.uid())
        );
    $f$, t);
  END LOOP;
END $$;
