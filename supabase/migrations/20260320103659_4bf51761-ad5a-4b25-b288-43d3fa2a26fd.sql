
-- Add team_id column to action_favorites
ALTER TABLE public.action_favorites ADD COLUMN team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE;

-- Add scope column: 'personal' or 'team'
ALTER TABLE public.action_favorites ADD COLUMN scope text NOT NULL DEFAULT 'personal';

-- Drop old unique constraint and create new one that allows both personal and team favorites
ALTER TABLE public.action_favorites DROP CONSTRAINT action_favorites_user_id_action_id_key;
ALTER TABLE public.action_favorites ADD CONSTRAINT action_favorites_unique_personal UNIQUE (user_id, action_id, scope);

-- Update RLS: team members can view team favorites
DROP POLICY IF EXISTS "Users can view own favorites" ON public.action_favorites;
CREATE POLICY "Users can view own or team favorites"
  ON public.action_favorites FOR SELECT TO authenticated
  USING (
    user_id = auth.uid() 
    OR (scope = 'team' AND team_id IN (
      SELECT p.team_id FROM profiles p WHERE p.id = auth.uid() AND p.team_id IS NOT NULL
    ))
  );

-- Update insert policy  
DROP POLICY IF EXISTS "Users can insert own favorites" ON public.action_favorites;
CREATE POLICY "Users can insert own favorites"
  ON public.action_favorites FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Update delete policy to allow deleting team favorites if you're the one who created it
DROP POLICY IF EXISTS "Users can delete own favorites" ON public.action_favorites;
CREATE POLICY "Users can delete own favorites"
  ON public.action_favorites FOR DELETE TO authenticated
  USING (user_id = auth.uid());
