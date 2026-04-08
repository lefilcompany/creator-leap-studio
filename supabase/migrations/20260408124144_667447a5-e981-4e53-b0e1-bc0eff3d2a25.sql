
CREATE TABLE public.generation_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  team_id UUID,
  action_id UUID,
  action_type TEXT,
  problem_type TEXT NOT NULL,
  description TEXT NOT NULL,
  screenshot_urls JSONB DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'open',
  admin_notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.generation_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create their own reports"
ON public.generation_reports
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own reports"
ON public.generation_reports
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "System admins can view all reports"
ON public.generation_reports
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'system'));

CREATE POLICY "System admins can update reports"
ON public.generation_reports
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'system'));

CREATE TRIGGER update_generation_reports_updated_at
BEFORE UPDATE ON public.generation_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
