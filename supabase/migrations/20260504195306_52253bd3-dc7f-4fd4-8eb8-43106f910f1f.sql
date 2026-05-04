CREATE TABLE public.agent_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  team_id uuid,
  brand_id uuid,
  agent_id text NOT NULL,
  target_type text NOT NULL,
  target_id uuid,
  rating text NOT NULL CHECK (rating IN ('positive','negative')),
  comment text,
  content_snapshot jsonb DEFAULT '{}'::jsonb,
  context jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_feedback_brand_agent ON public.agent_feedback(brand_id, agent_id, created_at DESC);
CREATE INDEX idx_agent_feedback_target ON public.agent_feedback(target_type, target_id);
CREATE INDEX idx_agent_feedback_user ON public.agent_feedback(user_id);

ALTER TABLE public.agent_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own or team agent feedback"
  ON public.agent_feedback FOR SELECT TO authenticated
  USING (can_access_resource(user_id, team_id) OR has_role(auth.uid(), 'system'::app_role));

CREATE POLICY "Users can create their own agent feedback"
  ON public.agent_feedback FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own agent feedback"
  ON public.agent_feedback FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own agent feedback"
  ON public.agent_feedback FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER trg_agent_feedback_updated_at
  BEFORE UPDATE ON public.agent_feedback
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();