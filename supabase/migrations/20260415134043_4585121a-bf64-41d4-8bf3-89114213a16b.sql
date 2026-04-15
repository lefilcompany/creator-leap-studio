
-- 1. Fix create_team_for_user to also insert into team_members
CREATE OR REPLACE FUNCTION public.create_team_for_user(p_user_id uuid, p_team_name text, p_team_code text, p_plan_id text DEFAULT 'free'::text)
 RETURNS TABLE(team_id uuid, team_name text, team_code text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_team_id UUID;
BEGIN
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

  IF EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = p_user_id AND p.team_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'User already has a team';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM public.plans WHERE id = p_plan_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Invalid or inactive plan';
  END IF;
  
  IF EXISTS (SELECT 1 FROM public.teams WHERE code = p_team_code) THEN
    RAISE EXCEPTION 'Team code already exists';
  END IF;

  INSERT INTO public.teams (name, code, admin_id, plan_id, credits, subscription_status)
  VALUES (trim(p_team_name), trim(p_team_code), p_user_id, p_plan_id, 20, 'active')
  RETURNING id INTO v_team_id;

  UPDATE public.profiles p SET team_id = v_team_id WHERE p.id = p_user_id;

  -- Also insert into team_members for consistency
  INSERT INTO public.team_members (user_id, team_id, role, joined_at)
  VALUES (p_user_id, v_team_id, 'admin', NOW())
  ON CONFLICT DO NOTHING;

  RETURN QUERY SELECT v_team_id, trim(p_team_name), trim(p_team_code);
END;
$function$;

-- 2. Fix notify_user_on_join_request_review to also insert into team_members
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
  IF OLD.status = 'pending' AND NEW.status != 'pending' THEN
    IF NEW.status NOT IN ('approved', 'rejected') THEN
      RAISE EXCEPTION 'Invalid status transition';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM public.teams WHERE id = NEW.team_id) THEN
      RAISE EXCEPTION 'Team does not exist';
    END IF;
    
    SELECT t.name INTO team_name FROM public.teams t WHERE t.id = NEW.team_id;
    
    status_text := CASE WHEN NEW.status = 'approved' THEN 'aprovada' ELSE 'rejeitada' END;
    
    INSERT INTO public.notifications (user_id, team_id, type, title, message, metadata)
    VALUES (
      NEW.user_id, NEW.team_id,
      'team_join_request_' || NEW.status,
      'Solicitação ' || status_text,
      'Sua solicitação para entrar na equipe ' || team_name || ' foi ' || status_text,
      jsonb_build_object('join_request_id', NEW.id, 'status', NEW.status)
    );
    
    IF NEW.status = 'approved' THEN
      IF EXISTS (
        SELECT 1 FROM public.profiles WHERE id = NEW.user_id AND team_id IS NOT NULL
      ) THEN
        RAISE EXCEPTION 'User already has a team';
      END IF;
      
      UPDATE public.profiles SET team_id = NEW.team_id WHERE id = NEW.user_id;
      
      -- Also insert into team_members for consistency
      INSERT INTO public.team_members (user_id, team_id, role, joined_at)
      VALUES (NEW.user_id, NEW.team_id, 'member', NOW())
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 3. Sync existing data: insert missing team_members rows
INSERT INTO public.team_members (user_id, team_id, role, joined_at)
SELECT 
  p.id,
  p.team_id,
  CASE WHEN t.admin_id = p.id THEN 'admin' ELSE 'member' END,
  COALESCE(p.created_at, NOW())
FROM public.profiles p
JOIN public.teams t ON t.id = p.team_id
WHERE p.team_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.team_members tm 
    WHERE tm.user_id = p.id AND tm.team_id = p.team_id
  );
