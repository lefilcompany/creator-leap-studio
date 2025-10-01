-- Atualizar a função create_team_for_user para inicializar créditos baseado no plano
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
  -- Verificar se o usuário já tem uma equipe
  IF EXISTS (
    SELECT 1 
    FROM public.profiles p
    WHERE p.id = p_user_id AND p.team_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Usuário já possui uma equipe';
  END IF;

  -- Buscar os créditos do plano
  SELECT 
    credits_quick_content,
    credits_suggestions,
    credits_plans,
    credits_reviews
  INTO v_plan_credits
  FROM public.plans
  WHERE id = p_plan_id;

  -- Criar a equipe com os créditos do plano
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
    p_team_name, 
    p_team_code, 
    p_user_id, 
    p_plan_id,
    v_plan_credits.credits_quick_content,
    v_plan_credits.credits_suggestions,
    v_plan_credits.credits_plans,
    v_plan_credits.credits_reviews
  )
  RETURNING id INTO v_team_id;

  -- Atualizar o perfil do usuário com o team_id
  UPDATE public.profiles p
  SET team_id = v_team_id
  WHERE p.id = p_user_id;

  -- Retornar os dados da equipe criada
  RETURN QUERY
  SELECT v_team_id, p_team_name, p_team_code;
END;
$function$;