-- Criar função SECURITY DEFINER para admins buscarem todas as equipes
CREATE OR REPLACE FUNCTION public.get_all_teams_admin()
RETURNS TABLE (
  id uuid,
  name text,
  credits integer,
  plan_id text,
  subscription_status text,
  created_at timestamptz,
  subscription_period_end timestamptz,
  admin_id uuid,
  code text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verifica se o usuário é admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado: usuário não é administrador';
  END IF;
  
  RETURN QUERY
  SELECT t.id, t.name, t.credits, t.plan_id, t.subscription_status, 
         t.created_at, t.subscription_period_end, t.admin_id, t.code
  FROM teams t
  ORDER BY t.created_at DESC;
END;
$$;

-- Criar função SECURITY DEFINER para admins buscarem todos os usuários
CREATE OR REPLACE FUNCTION public.get_all_users_admin()
RETURNS TABLE (
  id uuid,
  name text,
  email text,
  team_id uuid,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verifica se o usuário é admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado: usuário não é administrador';
  END IF;
  
  RETURN QUERY
  SELECT p.id, p.name, p.email, p.team_id, p.created_at
  FROM profiles p
  ORDER BY p.created_at DESC;
END;
$$;