-- Create brands table
CREATE TABLE IF NOT EXISTS public.brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  responsible TEXT NOT NULL,
  segment TEXT NOT NULL,
  values TEXT,
  keywords TEXT,
  goals TEXT,
  inspirations TEXT,
  success_metrics TEXT,
  brand_references TEXT,
  special_dates TEXT,
  promise TEXT,
  crisis_info TEXT,
  milestones TEXT,
  collaborations TEXT,
  restrictions TEXT,
  moodboard JSONB,
  logo JSONB,
  reference_image JSONB,
  color_palette JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create personas table
CREATE TABLE IF NOT EXISTS public.personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  gender TEXT NOT NULL,
  age TEXT NOT NULL,
  location TEXT NOT NULL,
  professional_context TEXT NOT NULL,
  beliefs_and_interests TEXT NOT NULL,
  content_consumption_routine TEXT NOT NULL,
  main_goal TEXT NOT NULL,
  challenges TEXT NOT NULL,
  preferred_tone_of_voice TEXT NOT NULL,
  purchase_journey_stage TEXT NOT NULL,
  interest_triggers TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create strategic_themes table
CREATE TABLE IF NOT EXISTS public.strategic_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  color_palette TEXT NOT NULL,
  tone_of_voice TEXT NOT NULL,
  target_audience TEXT NOT NULL,
  hashtags TEXT NOT NULL,
  objectives TEXT NOT NULL,
  content_format TEXT NOT NULL,
  macro_themes TEXT NOT NULL,
  best_formats TEXT NOT NULL,
  platforms TEXT NOT NULL,
  expected_action TEXT NOT NULL,
  additional_info TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create actions table (histórico de ações)
CREATE TABLE IF NOT EXISTS public.actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  brand_id UUID NOT NULL REFERENCES public.brands(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('CRIAR_CONTEUDO', 'REVISAR_CONTEUDO', 'PLANEJAR_CONTEUDO')),
  status TEXT NOT NULL DEFAULT 'Em revisão',
  approved BOOLEAN DEFAULT false,
  revisions INTEGER DEFAULT 0,
  details JSONB,
  result JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategic_themes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for brands
CREATE POLICY "Users can view their team's brands"
  ON public.brands FOR SELECT
  USING (team_id IN (
    SELECT team_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create brands for their team"
  ON public.brands FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    team_id IN (SELECT team_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update their team's brands"
  ON public.brands FOR UPDATE
  USING (team_id IN (
    SELECT team_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete their team's brands"
  ON public.brands FOR DELETE
  USING (team_id IN (
    SELECT team_id FROM public.profiles WHERE id = auth.uid()
  ));

-- RLS Policies for personas
CREATE POLICY "Users can view their team's personas"
  ON public.personas FOR SELECT
  USING (team_id IN (
    SELECT team_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create personas for their team"
  ON public.personas FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    team_id IN (SELECT team_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update their team's personas"
  ON public.personas FOR UPDATE
  USING (team_id IN (
    SELECT team_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete their team's personas"
  ON public.personas FOR DELETE
  USING (team_id IN (
    SELECT team_id FROM public.profiles WHERE id = auth.uid()
  ));

-- RLS Policies for strategic_themes
CREATE POLICY "Users can view their team's themes"
  ON public.strategic_themes FOR SELECT
  USING (team_id IN (
    SELECT team_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create themes for their team"
  ON public.strategic_themes FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    team_id IN (SELECT team_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update their team's themes"
  ON public.strategic_themes FOR UPDATE
  USING (team_id IN (
    SELECT team_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete their team's themes"
  ON public.strategic_themes FOR DELETE
  USING (team_id IN (
    SELECT team_id FROM public.profiles WHERE id = auth.uid()
  ));

-- RLS Policies for actions
CREATE POLICY "Users can view their team's actions"
  ON public.actions FOR SELECT
  USING (team_id IN (
    SELECT team_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can create actions for their team"
  ON public.actions FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    team_id IN (SELECT team_id FROM public.profiles WHERE id = auth.uid())
  );

CREATE POLICY "Users can update their team's actions"
  ON public.actions FOR UPDATE
  USING (team_id IN (
    SELECT team_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "Users can delete their team's actions"
  ON public.actions FOR DELETE
  USING (team_id IN (
    SELECT team_id FROM public.profiles WHERE id = auth.uid()
  ));

-- Create triggers for updated_at
CREATE TRIGGER update_brands_updated_at
  BEFORE UPDATE ON public.brands
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_personas_updated_at
  BEFORE UPDATE ON public.personas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_strategic_themes_updated_at
  BEFORE UPDATE ON public.strategic_themes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_actions_updated_at
  BEFORE UPDATE ON public.actions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_brands_team_id ON public.brands(team_id);
CREATE INDEX idx_brands_user_id ON public.brands(user_id);
CREATE INDEX idx_personas_team_id ON public.personas(team_id);
CREATE INDEX idx_personas_brand_id ON public.personas(brand_id);
CREATE INDEX idx_strategic_themes_team_id ON public.strategic_themes(team_id);
CREATE INDEX idx_strategic_themes_brand_id ON public.strategic_themes(brand_id);
CREATE INDEX idx_actions_team_id ON public.actions(team_id);
CREATE INDEX idx_actions_brand_id ON public.actions(brand_id);
CREATE INDEX idx_actions_type ON public.actions(type);