
CREATE POLICY "Workspace members can view co-members profiles"
ON public.profiles FOR SELECT
USING (
  EXISTS (
    SELECT 1
    FROM public.workspace_members me
    JOIN public.workspace_members other ON other.workspace_id = me.workspace_id
    WHERE me.user_id = auth.uid()
      AND me.status = 'active'
      AND other.user_id = profiles.id
  )
);
