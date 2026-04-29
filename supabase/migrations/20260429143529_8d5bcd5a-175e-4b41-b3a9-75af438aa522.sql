CREATE TABLE public.text_style_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  team_id UUID,
  name TEXT NOT NULL,
  description TEXT,
  layers JSONB NOT NULL DEFAULT '[]'::jsonb,
  thumbnail_url TEXT,
  is_shared BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.text_style_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create own templates"
  ON public.text_style_templates FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view own or shared team templates"
  ON public.text_style_templates FOR SELECT
  USING (
    user_id = auth.uid()
    OR (
      is_shared = true
      AND team_id IS NOT NULL
      AND team_id IN (
        SELECT p.team_id FROM profiles p
        WHERE p.id = auth.uid() AND p.team_id IS NOT NULL
      )
    )
  );

CREATE POLICY "Users can update own templates"
  ON public.text_style_templates FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own templates"
  ON public.text_style_templates FOR DELETE
  USING (user_id = auth.uid());

CREATE INDEX idx_text_style_templates_user ON public.text_style_templates(user_id);
CREATE INDEX idx_text_style_templates_team ON public.text_style_templates(team_id) WHERE is_shared = true;

CREATE TRIGGER trg_text_style_templates_updated_at
  BEFORE UPDATE ON public.text_style_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();