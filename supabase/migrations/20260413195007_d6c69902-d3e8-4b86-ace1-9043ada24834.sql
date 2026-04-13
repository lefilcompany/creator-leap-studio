
-- Tabela de feedback por criação
CREATE TABLE public.creation_feedback (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action_id UUID NOT NULL REFERENCES public.actions(id) ON DELETE CASCADE,
  brand_id UUID REFERENCES public.brands(id) ON DELETE SET NULL,
  team_id UUID,
  user_id UUID NOT NULL,
  rating TEXT NOT NULL CHECK (rating IN ('positive', 'negative')),
  tags TEXT[] DEFAULT '{}',
  comment TEXT,
  image_url TEXT,
  thumb_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(action_id, user_id)
);

-- Tabela de preferências de estilo por marca (consolidação de feedbacks)
CREATE TABLE public.brand_style_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  team_id UUID,
  user_id UUID NOT NULL,
  positive_patterns JSONB DEFAULT '[]',
  negative_patterns JSONB DEFAULT '[]',
  style_summary TEXT,
  total_positive INTEGER DEFAULT 0,
  total_negative INTEGER DEFAULT 0,
  last_updated_from_feedback_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(brand_id, team_id)
);

-- RLS para creation_feedback
ALTER TABLE public.creation_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own feedback"
  ON public.creation_feedback FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own feedback"
  ON public.creation_feedback FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can view own or team feedback"
  ON public.creation_feedback FOR SELECT
  TO authenticated
  USING (can_access_resource(user_id, team_id));

CREATE POLICY "Users can delete their own feedback"
  ON public.creation_feedback FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- RLS para brand_style_preferences
ALTER TABLE public.brand_style_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own or team preferences"
  ON public.brand_style_preferences FOR SELECT
  TO authenticated
  USING (can_access_resource(user_id, team_id));

CREATE POLICY "Users can create preferences"
  ON public.brand_style_preferences FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own or team preferences"
  ON public.brand_style_preferences FOR UPDATE
  TO authenticated
  USING (can_access_resource(user_id, team_id));

-- Índices para performance
CREATE INDEX idx_creation_feedback_action ON public.creation_feedback(action_id);
CREATE INDEX idx_creation_feedback_brand ON public.creation_feedback(brand_id);
CREATE INDEX idx_creation_feedback_rating ON public.creation_feedback(brand_id, rating);
CREATE INDEX idx_brand_style_prefs_brand ON public.brand_style_preferences(brand_id);
