-- Create credit_history table to track all credit usage
CREATE TABLE IF NOT EXISTS public.credit_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  credits_used INTEGER NOT NULL,
  credits_before INTEGER NOT NULL,
  credits_after INTEGER NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_credit_history_team_id ON public.credit_history(team_id);
CREATE INDEX idx_credit_history_user_id ON public.credit_history(user_id);
CREATE INDEX idx_credit_history_created_at ON public.credit_history(created_at DESC);

-- Enable RLS
ALTER TABLE public.credit_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their team's credit history"
  ON public.credit_history
  FOR SELECT
  USING (team_id IN (
    SELECT team_id FROM public.profiles WHERE id = auth.uid()
  ));

CREATE POLICY "System can insert credit history"
  ON public.credit_history
  FOR INSERT
  WITH CHECK (true);

-- Function to check and notify low credits
CREATE OR REPLACE FUNCTION public.check_and_notify_low_credits()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  plan_credits INTEGER;
  credit_percentage NUMERIC;
  notification_type TEXT;
  notification_title TEXT;
  notification_message TEXT;
  team_name TEXT;
  last_notification_type TEXT;
BEGIN
  -- Get plan credits limit
  SELECT p.credits INTO plan_credits
  FROM public.plans p
  WHERE p.id = NEW.plan_id;
  
  -- Get team name
  SELECT name INTO team_name FROM public.teams WHERE id = NEW.id;
  
  -- Calculate percentage
  IF plan_credits > 0 THEN
    credit_percentage := (NEW.credits::NUMERIC / plan_credits::NUMERIC) * 100;
  ELSE
    credit_percentage := 0;
  END IF;
  
  -- Get last notification type for this team
  SELECT type INTO last_notification_type
  FROM public.notifications
  WHERE team_id = NEW.id 
    AND type IN ('credits_low_10', 'credits_low_5', 'credits_zero')
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Determine notification type based on percentage
  IF NEW.credits = 0 AND last_notification_type != 'credits_zero' THEN
    notification_type := 'credits_zero';
    notification_title := 'Créditos esgotados!';
    notification_message := 'Sua equipe "' || team_name || '" ficou sem créditos. Faça upgrade do seu plano para continuar criando conteúdo.';
  ELSIF credit_percentage <= 5 AND credit_percentage > 0 AND last_notification_type != 'credits_low_5' THEN
    notification_type := 'credits_low_5';
    notification_title := 'Apenas 5% dos créditos restantes';
    notification_message := 'Sua equipe "' || team_name || '" está com apenas ' || NEW.credits || ' créditos restantes (' || ROUND(credit_percentage, 1) || '%). Considere fazer upgrade.';
  ELSIF credit_percentage <= 10 AND credit_percentage > 5 AND last_notification_type != 'credits_low_10' THEN
    notification_type := 'credits_low_10';
    notification_title := 'Créditos baixos - 10%';
    notification_message := 'Sua equipe "' || team_name || '" está com apenas ' || NEW.credits || ' créditos restantes (' || ROUND(credit_percentage, 1) || '%).';
  END IF;
  
  -- Create notification if type is set
  IF notification_type IS NOT NULL THEN
    -- Notify all team members
    INSERT INTO public.notifications (user_id, team_id, type, title, message, metadata)
    SELECT 
      p.id,
      NEW.id,
      notification_type,
      notification_title,
      notification_message,
      jsonb_build_object(
        'credits', NEW.credits,
        'percentage', ROUND(credit_percentage, 1),
        'plan_credits', plan_credits
      )
    FROM public.profiles p
    WHERE p.team_id = NEW.id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for low credit notifications
DROP TRIGGER IF EXISTS trigger_check_low_credits ON public.teams;
CREATE TRIGGER trigger_check_low_credits
  AFTER UPDATE OF credits
  ON public.teams
  FOR EACH ROW
  WHEN (OLD.credits IS DISTINCT FROM NEW.credits)
  EXECUTE FUNCTION public.check_and_notify_low_credits();