-- Fase 1: Atualizar função create_team_for_user para calcular subscription_period_end
CREATE OR REPLACE FUNCTION public.create_team_for_user(p_user_id uuid, p_team_name text, p_team_code text, p_plan_id text DEFAULT 'free'::text)
RETURNS TABLE(team_id uuid, team_name text, team_code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_team_id UUID;
  v_plan_credits RECORD;
  v_trial_days INTEGER;
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

  -- Fetch plan credits and trial days
  SELECT 
    credits_quick_content,
    credits_suggestions,
    credits_plans,
    credits_reviews,
    trial_days
  INTO v_plan_credits
  FROM public.plans
  WHERE id = p_plan_id;

  -- Create the team with plan credits and calculated subscription_period_end
  INSERT INTO public.teams (
    name, 
    code, 
    admin_id, 
    plan_id,
    credits_quick_content,
    credits_suggestions,
    credits_plans,
    credits_reviews,
    subscription_period_end
  )
  VALUES (
    trim(p_team_name), 
    trim(p_team_code), 
    p_user_id, 
    p_plan_id,
    v_plan_credits.credits_quick_content,
    v_plan_credits.credits_suggestions,
    v_plan_credits.credits_plans,
    v_plan_credits.credits_reviews,
    NOW() + (v_plan_credits.trial_days || ' days')::INTERVAL
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

-- Migração: Atualizar equipes existentes com subscription_period_end
UPDATE public.teams 
SET subscription_period_end = created_at + INTERVAL '7 days'
WHERE plan_id = 'free' AND subscription_period_end IS NULL;