
-- Função para alinhar créditos das equipes com seus planos e configurar trial
CREATE OR REPLACE FUNCTION align_team_credits_and_setup_trial()
RETURNS TABLE(
  team_id uuid,
  team_name text,
  plan_id text,
  action_taken text
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Atualizar créditos de todas as equipes para não exceder o limite do plano
  -- E configurar trial de 7 dias para planos free
  RETURN QUERY
  UPDATE teams t
  SET 
    credits_quick_content = LEAST(t.credits_quick_content, p.credits_quick_content),
    credits_suggestions = LEAST(t.credits_suggestions, p.credits_suggestions),
    credits_reviews = LEAST(t.credits_reviews, p.credits_reviews),
    credits_plans = LEAST(t.credits_plans, p.credits_plans),
    -- Para planos free, configurar trial de 7 dias a partir de hoje se ainda não tiver
    subscription_period_end = CASE 
      WHEN t.plan_id = 'free' AND (t.subscription_period_end IS NULL OR t.subscription_period_end < NOW()) 
      THEN NOW() + INTERVAL '7 days'
      ELSE t.subscription_period_end
    END,
    subscription_status = CASE
      WHEN t.plan_id = 'free' AND (t.subscription_period_end IS NULL OR t.subscription_period_end < NOW())
      THEN 'trialing'
      WHEN t.subscription_period_end IS NOT NULL AND t.subscription_period_end < NOW()
      THEN 'expired'
      WHEN t.subscription_period_end IS NOT NULL AND t.subscription_period_end >= NOW()
      THEN 'active'
      ELSE t.subscription_status
    END,
    updated_at = NOW()
  FROM plans p
  WHERE t.plan_id = p.id
  RETURNING 
    t.id as team_id,
    t.name as team_name,
    t.plan_id,
    CASE 
      WHEN t.plan_id = 'free' THEN 'Trial de 7 dias iniciado'
      ELSE 'Créditos alinhados com o plano'
    END as action_taken;
END;
$$;

-- Executar a função para alinhar todas as equipes
SELECT * FROM align_team_credits_and_setup_trial();

-- Função para verificar se a equipe tem acesso (não está bloqueada)
CREATE OR REPLACE FUNCTION check_team_access(p_team_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_subscription_status text;
  v_subscription_end timestamptz;
  v_plan_id text;
BEGIN
  SELECT subscription_status, subscription_period_end, plan_id
  INTO v_subscription_status, v_subscription_end, v_plan_id
  FROM teams
  WHERE id = p_team_id;
  
  -- Se não encontrou a equipe, bloquear
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Planos enterprise sempre têm acesso
  IF v_plan_id = 'enterprise' THEN
    RETURN true;
  END IF;
  
  -- Se o período de assinatura expirou, bloquear
  IF v_subscription_end IS NOT NULL AND v_subscription_end < NOW() THEN
    RETURN false;
  END IF;
  
  -- Se o status é expired, bloquear
  IF v_subscription_status = 'expired' THEN
    RETURN false;
  END IF;
  
  -- Caso contrário, permitir acesso
  RETURN true;
END;
$$;

-- Atualizar status de equipes expiradas
UPDATE teams
SET subscription_status = 'expired'
WHERE subscription_period_end IS NOT NULL 
  AND subscription_period_end < NOW()
  AND subscription_status != 'expired';
