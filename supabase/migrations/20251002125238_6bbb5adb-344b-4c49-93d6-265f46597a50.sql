-- Add input validation to create_team_for_user function
CREATE OR REPLACE FUNCTION public.create_team_for_user(
  p_user_id uuid, 
  p_team_name text, 
  p_team_code text, 
  p_plan_id text DEFAULT 'free'::text
)
RETURNS TABLE(team_id uuid, team_name text, team_code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_team_id UUID;
  v_plan_credits RECORD;
BEGIN
  -- Input validation
  IF p_team_name IS NULL OR length(trim(p_team_name)) < 3 THEN
    RAISE EXCEPTION 'Team name must be at least 3 characters';
  END IF;
  
  IF length(p_team_name) > 100 THEN
    RAISE EXCEPTION 'Team name must be less than 100 characters';
  END IF;
  
  IF p_team_code IS NULL OR length(trim(p_team_code)) < 3 THEN
    RAISE EXCEPTION 'Team code must be at least 3 characters';
  END IF;
  
  IF length(p_team_code) > 50 THEN
    RAISE EXCEPTION 'Team code must be less than 50 characters';
  END IF;

  -- Verify user already has a team BEFORE any operations
  IF EXISTS (
    SELECT 1 
    FROM public.profiles p
    WHERE p.id = p_user_id AND p.team_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'User already has a team';
  END IF;
  
  -- Verify plan exists and is active
  IF NOT EXISTS (
    SELECT 1 
    FROM public.plans 
    WHERE id = p_plan_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Invalid or inactive plan';
  END IF;
  
  -- Check team code uniqueness
  IF EXISTS (SELECT 1 FROM public.teams WHERE code = p_team_code) THEN
    RAISE EXCEPTION 'Team code already exists';
  END IF;

  -- Fetch plan credits
  SELECT 
    credits_quick_content,
    credits_suggestions,
    credits_plans,
    credits_reviews
  INTO v_plan_credits
  FROM public.plans
  WHERE id = p_plan_id;

  -- Create the team with plan credits
  INSERT INTO public.teams (
    name, 
    code, 
    admin_id, 
    plan_id,
    credits_quick_content,
    credits_suggestions,
    credits_plans,
    credits_reviews
  )
  VALUES (
    trim(p_team_name), 
    trim(p_team_code), 
    p_user_id, 
    p_plan_id,
    v_plan_credits.credits_quick_content,
    v_plan_credits.credits_suggestions,
    v_plan_credits.credits_plans,
    v_plan_credits.credits_reviews
  )
  RETURNING id INTO v_team_id;

  -- Update user profile with team_id
  UPDATE public.profiles p
  SET team_id = v_team_id
  WHERE p.id = p_user_id;

  -- Return team data
  RETURN QUERY
  SELECT v_team_id, trim(p_team_name), trim(p_team_code);
END;
$function$;

-- Add input validation to notify_user_on_join_request_review function
CREATE OR REPLACE FUNCTION public.notify_user_on_join_request_review()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  team_name text;
  status_text text;
BEGIN
  -- Only notify if status changed from pending
  IF OLD.status = 'pending' AND NEW.status != 'pending' THEN
    -- Validate status is approved or rejected
    IF NEW.status NOT IN ('approved', 'rejected') THEN
      RAISE EXCEPTION 'Invalid status transition';
    END IF;
    
    -- Verify team exists
    IF NOT EXISTS (SELECT 1 FROM public.teams WHERE id = NEW.team_id) THEN
      RAISE EXCEPTION 'Team does not exist';
    END IF;
    
    -- Fetch team name
    SELECT t.name INTO team_name
    FROM public.teams t
    WHERE t.id = NEW.team_id;
    
    -- Set status text
    status_text := CASE 
      WHEN NEW.status = 'approved' THEN 'aprovada'
      ELSE 'rejeitada'
    END;
    
    -- Create notification for user
    INSERT INTO public.notifications (user_id, team_id, type, title, message, metadata)
    VALUES (
      NEW.user_id,
      NEW.team_id,
      'team_join_request_' || NEW.status,
      'Solicitação ' || status_text,
      'Sua solicitação para entrar na equipe ' || team_name || ' foi ' || status_text,
      jsonb_build_object('join_request_id', NEW.id, 'status', NEW.status)
    );
    
    -- If approved, add user to team (only if they don't have a team)
    IF NEW.status = 'approved' THEN
      -- Check if user already has a team
      IF EXISTS (
        SELECT 1 
        FROM public.profiles 
        WHERE id = NEW.user_id AND team_id IS NOT NULL
      ) THEN
        RAISE EXCEPTION 'User already has a team';
      END IF;
      
      UPDATE public.profiles
      SET team_id = NEW.team_id
      WHERE id = NEW.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;