CREATE TABLE public.content_briefings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  team_id uuid,
  brand_id uuid NOT NULL,
  theme_id uuid,
  persona_id uuid,
  platform text,
  objective text,
  content_type text NOT NULL DEFAULT 'organic',
  idea text NOT NULL,
  tone text[] NOT NULL DEFAULT '{}',
  additional_notes text,
  templates jsonb NOT NULL DEFAULT '[]'::jsonb,
  selected_template_id text,
  edited_template jsonb,
  status text NOT NULL DEFAULT 'draft',
  action_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.content_briefings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create briefings"
ON public.content_briefings
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own or team briefings"
ON public.content_briefings
FOR SELECT
USING (public.can_access_resource(user_id, team_id));

CREATE POLICY "Users can update own or team briefings"
ON public.content_briefings
FOR UPDATE
USING (public.can_access_resource(user_id, team_id));

CREATE POLICY "Users can delete own or team briefings"
ON public.content_briefings
FOR DELETE
USING (public.can_access_resource(user_id, team_id));

CREATE POLICY "System admins can view all briefings"
ON public.content_briefings
FOR SELECT
USING (public.has_role(auth.uid(), 'system'::app_role));

CREATE TRIGGER update_content_briefings_updated_at
BEFORE UPDATE ON public.content_briefings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_content_briefings_user ON public.content_briefings(user_id);
CREATE INDEX idx_content_briefings_team ON public.content_briefings(team_id);
CREATE INDEX idx_content_briefings_brand ON public.content_briefings(brand_id);
CREATE INDEX idx_content_briefings_status ON public.content_briefings(status);