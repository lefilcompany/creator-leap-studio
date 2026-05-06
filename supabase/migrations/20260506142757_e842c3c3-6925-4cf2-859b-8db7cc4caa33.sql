
-- Default member credit limit becomes 0 (blocked) — owners are exempt anyway
ALTER TABLE public.workspace_members
  ALTER COLUMN monthly_credit_limit SET DEFAULT 0;

-- Backfill: members (não-owner) com NULL viram 0 (bloqueados por padrão);
-- owners ficam NULL (sem limite).
UPDATE public.workspace_members wm
SET monthly_credit_limit = 0
WHERE wm.monthly_credit_limit IS NULL
  AND wm.role <> 'owner';

UPDATE public.workspace_members wm
SET monthly_credit_limit = NULL
WHERE wm.role = 'owner';

-- RPC: transferir créditos pessoais do owner -> pool compartilhado do workspace
CREATE OR REPLACE FUNCTION public.workspace_transfer_personal_to_shared(
  p_workspace_id uuid,
  p_amount integer
) RETURNS TABLE(new_personal_credits integer, new_shared_credits integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid;
  v_mode text;
  v_personal integer;
  v_shared integer;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Valor deve ser maior que zero';
  END IF;

  SELECT owner_id, credit_mode, shared_credits
    INTO v_owner, v_mode, v_shared
  FROM public.workspaces WHERE id = p_workspace_id;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Workspace não encontrado';
  END IF;
  IF v_owner <> auth.uid() THEN
    RAISE EXCEPTION 'Apenas o dono pode transferir créditos';
  END IF;
  IF v_mode <> 'shared' THEN
    RAISE EXCEPTION 'Workspace não está em modo compartilhado';
  END IF;

  SELECT credits INTO v_personal FROM public.profiles WHERE id = v_owner;
  IF COALESCE(v_personal, 0) < p_amount THEN
    RAISE EXCEPTION 'Créditos pessoais insuficientes';
  END IF;

  UPDATE public.profiles SET credits = credits - p_amount WHERE id = v_owner
    RETURNING credits INTO v_personal;
  UPDATE public.workspaces SET shared_credits = COALESCE(shared_credits,0) + p_amount
    WHERE id = p_workspace_id
    RETURNING shared_credits INTO v_shared;

  RETURN QUERY SELECT v_personal, v_shared;
END;
$$;
