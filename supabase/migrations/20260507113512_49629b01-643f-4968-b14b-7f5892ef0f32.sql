
-- Add last_credit_reset_at to support lazy monthly reset
ALTER TABLE public.workspace_members
  ADD COLUMN IF NOT EXISTS last_credit_reset_at timestamptz NOT NULL DEFAULT date_trunc('month', now());

-- Centralized credit consumption RPC
-- Behavior:
--  * personal credit mode: debits profiles.credits only (respects expiration); ignores monthly_credit_limit
--  * shared credit mode: debits workspaces.shared_credits, enforces workspace_members.monthly_credit_limit
--      - owner is exempt from limit
--      - NULL limit => BLOCKED (member must have explicit allocation)
--      - lazy monthly reset: if last_credit_reset_at < current month start, reset credits_used_this_month to 0
--  * always logs to credit_history
CREATE OR REPLACE FUNCTION public.consume_workspace_credits(
  p_workspace_id uuid,
  p_user_id uuid,
  p_amount integer,
  p_action_type text,
  p_reference_id uuid DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE(success boolean, new_balance integer, credit_mode text, error text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ws_credit_mode text;
  v_ws_shared integer;
  v_ws_owner uuid;
  v_member_limit integer;
  v_member_used integer;
  v_member_role text;
  v_member_reset timestamptz;
  v_month_start timestamptz := date_trunc('month', now());
  v_profile_credits integer;
  v_profile_expire timestamptz;
  v_before integer;
  v_after integer;
  v_team_id uuid;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN QUERY SELECT false, 0, NULL::text, 'Valor inválido'::text;
    RETURN;
  END IF;

  -- Resolve workspace (may be null -> fallback to user's current_workspace_id)
  IF p_workspace_id IS NULL THEN
    SELECT current_workspace_id INTO p_workspace_id FROM profiles WHERE id = p_user_id;
  END IF;

  IF p_workspace_id IS NOT NULL THEN
    SELECT credit_mode, COALESCE(shared_credits, 0), owner_id
      INTO v_ws_credit_mode, v_ws_shared, v_ws_owner
    FROM workspaces WHERE id = p_workspace_id;
  END IF;

  SELECT team_id INTO v_team_id FROM profiles WHERE id = p_user_id;

  -- ============ SHARED MODE ============
  IF v_ws_credit_mode = 'shared' THEN
    SELECT monthly_credit_limit, COALESCE(credits_used_this_month, 0), role, last_credit_reset_at
      INTO v_member_limit, v_member_used, v_member_role, v_member_reset
    FROM workspace_members
    WHERE workspace_id = p_workspace_id AND user_id = p_user_id AND status = 'active';

    IF v_member_role IS NULL THEN
      RETURN QUERY SELECT false, v_ws_shared, 'shared'::text, 'Você não é membro ativo deste workspace'::text;
      RETURN;
    END IF;

    -- Lazy monthly reset
    IF v_member_reset IS NULL OR v_member_reset < v_month_start THEN
      UPDATE workspace_members
        SET credits_used_this_month = 0, last_credit_reset_at = v_month_start
        WHERE workspace_id = p_workspace_id AND user_id = p_user_id;
      v_member_used := 0;
    END IF;

    -- Enforce limit (owner exempt; NULL = blocked)
    IF p_user_id <> v_ws_owner THEN
      IF v_member_limit IS NULL THEN
        RETURN QUERY SELECT false, v_ws_shared, 'shared'::text,
          'Você ainda não tem limite mensal de créditos definido. Peça ao dono do workspace para configurar seu limite.'::text;
        RETURN;
      END IF;
      IF v_member_used + p_amount > v_member_limit THEN
        RETURN QUERY SELECT false, v_ws_shared, 'shared'::text,
          'Limite mensal de créditos atingido. Peça ao dono para aumentar seu limite.'::text;
        RETURN;
      END IF;
    END IF;

    IF v_ws_shared < p_amount THEN
      RETURN QUERY SELECT false, v_ws_shared, 'shared'::text, 'Créditos compartilhados insuficientes.'::text;
      RETURN;
    END IF;

    v_before := v_ws_shared;
    v_after := v_ws_shared - p_amount;

    UPDATE workspaces SET shared_credits = v_after WHERE id = p_workspace_id;
    UPDATE workspace_members
      SET credits_used_this_month = v_member_used + p_amount
      WHERE workspace_id = p_workspace_id AND user_id = p_user_id;

    INSERT INTO credit_history (user_id, team_id, workspace_id, action_type, credits_used, credits_before, credits_after, description, metadata)
    VALUES (p_user_id, v_team_id, p_workspace_id, p_action_type, p_amount, v_before, v_after,
            'Consumo workspace compartilhado',
            COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object('reference_id', p_reference_id, 'mode', 'shared'));

    RETURN QUERY SELECT true, v_after, 'shared'::text, NULL::text;
    RETURN;
  END IF;

  -- ============ PERSONAL MODE (default) ============
  SELECT COALESCE(credits, 0), credits_expire_at
    INTO v_profile_credits, v_profile_expire
  FROM profiles WHERE id = p_user_id;

  IF v_profile_expire IS NOT NULL AND v_profile_expire < now() THEN
    RETURN QUERY SELECT false, 0, 'personal'::text, 'Seus créditos expiraram. Adquira um novo pacote para continuar.'::text;
    RETURN;
  END IF;

  IF v_profile_credits < p_amount THEN
    RETURN QUERY SELECT false, v_profile_credits, 'personal'::text, 'Créditos insuficientes'::text;
    RETURN;
  END IF;

  v_before := v_profile_credits;
  v_after := v_profile_credits - p_amount;

  UPDATE profiles SET credits = v_after WHERE id = p_user_id;

  INSERT INTO credit_history (user_id, team_id, workspace_id, action_type, credits_used, credits_before, credits_after, description, metadata)
  VALUES (p_user_id, v_team_id, p_workspace_id, p_action_type, p_amount, v_before, v_after,
          'Consumo pessoal',
          COALESCE(p_metadata, '{}'::jsonb) || jsonb_build_object('reference_id', p_reference_id, 'mode', 'personal'));

  RETURN QUERY SELECT true, v_after, 'personal'::text, NULL::text;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_workspace_credits(uuid, uuid, integer, text, uuid, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.consume_workspace_credits(uuid, uuid, integer, text, uuid, jsonb) TO authenticated, service_role;
