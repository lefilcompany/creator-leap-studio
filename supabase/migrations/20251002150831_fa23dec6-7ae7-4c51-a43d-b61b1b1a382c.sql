-- Criar função para buscar ID da equipe por código de forma segura
-- Usa SECURITY DEFINER para contornar RLS e permitir busca por código
CREATE OR REPLACE FUNCTION public.get_team_id_by_code(p_team_code text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_id uuid;
BEGIN
  -- Validar que o código não está vazio
  IF p_team_code IS NULL OR length(trim(p_team_code)) = 0 THEN
    RETURN NULL;
  END IF;
  
  -- Buscar equipe pelo código
  SELECT id INTO v_team_id
  FROM public.teams
  WHERE code = trim(p_team_code);
  
  RETURN v_team_id;
END;
$$;

-- Comentário explicativo
COMMENT ON FUNCTION public.get_team_id_by_code IS 'Retorna o ID da equipe dado um código válido. Permite que usuários sem equipe busquem equipes para solicitar entrada.';