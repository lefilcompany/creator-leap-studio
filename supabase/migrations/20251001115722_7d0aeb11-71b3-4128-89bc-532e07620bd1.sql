-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  team_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Create teams table
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT UNIQUE,
  admin_id UUID NOT NULL,
  plan_id TEXT NOT NULL DEFAULT 'free',
  credits_quick_content INTEGER DEFAULT 100,
  credits_suggestions INTEGER DEFAULT 50,
  credits_reviews INTEGER DEFAULT 20,
  credits_plans INTEGER DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Create content_generations table to store generated content
CREATE TABLE public.content_generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  brand_id TEXT,
  theme_id TEXT,
  persona_id TEXT,
  platform TEXT NOT NULL,
  content_type TEXT NOT NULL, -- 'image' or 'video'
  objective TEXT NOT NULL,
  description TEXT NOT NULL,
  tone_of_voice TEXT[],
  additional_info TEXT,
  generated_image_url TEXT,
  generated_caption TEXT,
  metadata JSONB, -- Store additional data like video settings, etc.
  total_revisions INTEGER DEFAULT 0,
  free_revisions_used INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.content_generations ENABLE ROW LEVEL SECURITY;

-- Create content_revisions table to store revision history
CREATE TABLE public.content_revisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID NOT NULL REFERENCES public.content_generations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  revision_type TEXT NOT NULL, -- 'image' or 'caption'
  revision_prompt TEXT NOT NULL,
  previous_value TEXT,
  new_value TEXT,
  was_free_revision BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.content_revisions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for teams
CREATE POLICY "Users can view their team"
  ON public.teams FOR SELECT
  USING (
    id IN (
      SELECT team_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Team admins can update their team"
  ON public.teams FOR UPDATE
  USING (admin_id = auth.uid());

CREATE POLICY "Users can create teams"
  ON public.teams FOR INSERT
  WITH CHECK (admin_id = auth.uid());

-- RLS Policies for content_generations
CREATE POLICY "Users can view their team's content"
  ON public.content_generations FOR SELECT
  USING (
    team_id IN (
      SELECT team_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can create content for their team"
  ON public.content_generations FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    team_id IN (
      SELECT team_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update their team's content"
  ON public.content_generations FOR UPDATE
  USING (
    team_id IN (
      SELECT team_id FROM public.profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their team's content"
  ON public.content_generations FOR DELETE
  USING (
    team_id IN (
      SELECT team_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- RLS Policies for content_revisions
CREATE POLICY "Users can view their team's revisions"
  ON public.content_revisions FOR SELECT
  USING (
    content_id IN (
      SELECT id FROM public.content_generations
      WHERE team_id IN (
        SELECT team_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can create revisions for their team's content"
  ON public.content_revisions FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    content_id IN (
      SELECT id FROM public.content_generations
      WHERE team_id IN (
        SELECT team_id FROM public.profiles WHERE id = auth.uid()
      )
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_content_generations_updated_at
  BEFORE UPDATE ON public.content_generations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Usuário Creator')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create indexes for better performance
CREATE INDEX idx_content_generations_user_id ON public.content_generations(user_id);
CREATE INDEX idx_content_generations_team_id ON public.content_generations(team_id);
CREATE INDEX idx_content_revisions_content_id ON public.content_revisions(content_id);
CREATE INDEX idx_profiles_team_id ON public.profiles(team_id);