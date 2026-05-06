CREATE OR REPLACE FUNCTION public.workspace_transfer_shared_to_personal(p_workspace_id uuid, p_amount integer)
RETURNS TABLE(new_personal_credits integer, new_shared_credits integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_owner uuid;
  v_personal integer;
  v_shared integer;
  v_to_transfer integer;
BEGIN
  IF p_amount IS NULL OR p_amount < 0 THEN
    RAISE EXCEPTION 'Valor inválido';
  END IF;

  SELECT owner_id, COALESCE(shared_credits,0) INTO v_owner, v_shared
  FROM public.workspaces WHERE id = p_workspace_id;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Workspace não encontrado';
  END IF;
  IF v_owner <> auth.uid() THEN
    RAISE EXCEPTION 'Apenas o dono pode transferir créditos';
  END IF;

  v_to_transfer := LEAST(p_amount, v_shared);

  IF v_to_transfer > 0 THEN
    UPDATE public.workspaces SET shared_credits = COALESCE(shared_credits,0) - v_to_transfer
      WHERE id = p_workspace_id RETURNING shared_credits INTO v_shared;
    UPDATE public.profiles SET credits = COALESCE(credits,0) + v_to_transfer,
      max_credits = GREATEST(COALESCE(max_credits,0), COALESCE(credits,0) + v_to_transfer)
      WHERE id = v_owner RETURNING credits INTO v_personal;
  ELSE
    SELECT credits INTO v_personal FROM public.profiles WHERE id = v_owner;
  END IF;

  RETURN QUERY SELECT v_personal, v_shared;
END;
$function$;