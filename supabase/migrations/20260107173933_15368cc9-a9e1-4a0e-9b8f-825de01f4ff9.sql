-- Create user_events table for tracking clicks and errors
CREATE TABLE public.user_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- 'click', 'error', 'page_view', etc.
  event_name TEXT NOT NULL, -- name/identifier of the event
  event_data JSONB, -- additional data like element clicked, error message, stack trace
  page_url TEXT, -- URL where the event occurred
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;

-- Policy for admins to read all events
CREATE POLICY "Admins can read all events"
ON public.user_events
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Policy for users to insert their own events
CREATE POLICY "Users can insert their own events"
ON public.user_events
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_user_events_user_id ON public.user_events(user_id);
CREATE INDEX idx_user_events_created_at ON public.user_events(created_at DESC);
CREATE INDEX idx_user_events_event_type ON public.user_events(event_type);