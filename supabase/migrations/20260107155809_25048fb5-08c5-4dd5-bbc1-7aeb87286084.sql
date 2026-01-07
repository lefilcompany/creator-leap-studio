-- Drop and recreate get_all_users_admin with all profile fields
DROP FUNCTION IF EXISTS public.get_all_users_admin();

CREATE FUNCTION public.get_all_users_admin()
 RETURNS TABLE(
   id uuid, 
   name text, 
   email text, 
   team_id uuid, 
   created_at timestamp with time zone,
   phone text,
   state text,
   city text,
   avatar_url text,
   tutorial_completed boolean
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  -- Verifica se o usuário é admin
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado: usuário não é administrador';
  END IF;
  
  RETURN QUERY
  SELECT 
    p.id, 
    p.name, 
    p.email, 
    p.team_id, 
    p.created_at,
    p.phone,
    p.state,
    p.city,
    p.avatar_url,
    p.tutorial_completed
  FROM profiles p
  ORDER BY p.created_at DESC;
END;
$$;