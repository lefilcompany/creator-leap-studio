-- Corrigir função para especificar tabelas explicitamente
CREATE OR REPLACE FUNCTION public.create_team_for_user(
  p_user_id UUID,
  p_team_name TEXT,
  p_team_code TEXT,
  p_plan_id TEXT DEFAULT 'free'
)
RETURNS TABLE(team_id UUID, team_name TEXT, team_code TEXT) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id UUID;
BEGIN
  -- Verificar se o usuário já tem uma equipe
  IF EXISTS (
    SELECT 1 
    FROM public.profiles p
    WHERE p.id = p_user_id AND p.team_id IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Usuário já possui uma equipe';
  END IF;

  -- Criar a equipe
  INSERT INTO public.teams (name, code, admin_id, plan_id)
  VALUES (p_team_name, p_team_code, p_user_id, p_plan_id)
  RETURNING id INTO v_team_id;

  -- Atualizar o perfil do usuário com o team_id
  UPDATE public.profiles p
  SET team_id = v_team_id
  WHERE p.id = p_user_id;

  -- Retornar os dados da equipe criada
  RETURN QUERY
  SELECT v_team_id, p_team_name, p_team_code;
END;
$$;