
CREATE TABLE public.agent_style_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID,
  agent_id TEXT NOT NULL,
  style_summary TEXT,
  positive_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  negative_rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  feedbacks_processed INTEGER NOT NULL DEFAULT 0,
  last_revised_at TIMESTAMPTZ,
  manually_edited BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (brand_id, agent_id)
);

CREATE INDEX idx_agent_style_summaries_brand_agent ON public.agent_style_summaries(brand_id, agent_id);

ALTER TABLE public.agent_style_summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "System admins can view all agent style summaries"
  ON public.agent_style_summaries FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'system'::app_role));

CREATE POLICY "System admins can update agent style summaries"
  ON public.agent_style_summaries FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'system'::app_role));

CREATE POLICY "System admins can delete agent style summaries"
  ON public.agent_style_summaries FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'system'::app_role));

CREATE TRIGGER update_agent_style_summaries_updated_at
  BEFORE UPDATE ON public.agent_style_summaries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
