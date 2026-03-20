
-- Table: action_categories
CREATE TABLE public.action_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  color text DEFAULT '#6366f1',
  user_id uuid NOT NULL,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  visibility text NOT NULL DEFAULT 'personal',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Table: action_category_members
CREATE TABLE public.action_category_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.action_categories(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'viewer',
  created_at timestamptz DEFAULT now(),
  UNIQUE(category_id, user_id)
);

-- Table: action_category_items
CREATE TABLE public.action_category_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.action_categories(id) ON DELETE CASCADE,
  action_id uuid NOT NULL REFERENCES public.actions(id) ON DELETE CASCADE,
  added_by uuid NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(category_id, action_id)
);

-- Enable RLS
ALTER TABLE public.action_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_category_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.action_category_items ENABLE ROW LEVEL SECURITY;

-- Security definer function to check category access
CREATE OR REPLACE FUNCTION public.can_access_category(p_category_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.action_categories c
    WHERE c.id = p_category_id
    AND (
      c.user_id = auth.uid()
      OR (
        c.visibility = 'team' AND c.team_id IN (
          SELECT p.team_id FROM public.profiles p WHERE p.id = auth.uid() AND p.team_id IS NOT NULL
        )
      )
    )
  )
$$;

-- Security definer function to check if user can edit category
CREATE OR REPLACE FUNCTION public.can_edit_category(p_category_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.action_categories c
    WHERE c.id = p_category_id AND c.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.action_category_members m
    WHERE m.category_id = p_category_id AND m.user_id = auth.uid() AND m.role = 'editor'
  )
$$;

-- RLS for action_categories
CREATE POLICY "Users can view own or team categories" ON public.action_categories
  FOR SELECT USING (
    user_id = auth.uid()
    OR (
      visibility = 'team' AND team_id IN (
        SELECT p.team_id FROM public.profiles p WHERE p.id = auth.uid() AND p.team_id IS NOT NULL
      )
    )
  );

CREATE POLICY "Users can create categories" ON public.action_categories
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Only owner can update categories" ON public.action_categories
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Only owner can delete categories" ON public.action_categories
  FOR DELETE USING (user_id = auth.uid());

-- RLS for action_category_members
CREATE POLICY "Category members visible to category viewers" ON public.action_category_members
  FOR SELECT USING (public.can_access_category(category_id));

CREATE POLICY "Only category owner can manage members" ON public.action_category_members
  FOR INSERT WITH CHECK (public.can_edit_category(category_id));

CREATE POLICY "Only category owner can update members" ON public.action_category_members
  FOR UPDATE USING (public.can_edit_category(category_id));

CREATE POLICY "Only category owner can delete members" ON public.action_category_members
  FOR DELETE USING (public.can_edit_category(category_id));

-- RLS for action_category_items
CREATE POLICY "Category items visible to category viewers" ON public.action_category_items
  FOR SELECT USING (public.can_access_category(category_id));

CREATE POLICY "Editors can add items" ON public.action_category_items
  FOR INSERT WITH CHECK (public.can_edit_category(category_id));

CREATE POLICY "Editors can remove items" ON public.action_category_items
  FOR DELETE USING (public.can_edit_category(category_id));

-- Trigger for updated_at
CREATE TRIGGER update_action_categories_updated_at
  BEFORE UPDATE ON public.action_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
