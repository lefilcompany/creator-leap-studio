-- Create table for user presence history
CREATE TABLE public.user_presence_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  team_id UUID,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_presence_history ENABLE ROW LEVEL SECURITY;

-- Admins can view all presence history
CREATE POLICY "Admins can view all presence history"
ON public.user_presence_history
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

-- Users can insert their own presence records
CREATE POLICY "Users can insert their own presence"
ON public.user_presence_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own presence records
CREATE POLICY "Users can update their own presence"
ON public.user_presence_history
FOR UPDATE
USING (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_user_presence_history_user_id ON public.user_presence_history(user_id);
CREATE INDEX idx_user_presence_history_started_at ON public.user_presence_history(started_at DESC);

-- Enable realtime for this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence_history;