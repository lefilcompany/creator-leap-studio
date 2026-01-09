-- Atualizar admin@admin.com para role 'system'
UPDATE public.user_roles 
SET role = 'system' 
WHERE user_id = (SELECT id FROM profiles WHERE email = 'admin@admin.com')
AND role = 'admin';

-- Remover role 'admin' de quem é apenas admin de equipe
DELETE FROM public.user_roles 
WHERE role = 'admin' 
AND user_id NOT IN (SELECT id FROM profiles WHERE email = 'admin@admin.com');

-- Remover trigger e função que adiciona role admin automaticamente (CASCADE)
DROP FUNCTION IF EXISTS public.assign_admin_role_on_team_creation() CASCADE;

-- Atualizar função auto_assign_admin_role para usar 'system'
CREATE OR REPLACE FUNCTION public.auto_assign_admin_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.email = 'admin@admin.com' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'system')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

-- Atualizar função get_all_teams_admin para verificar role 'system'
CREATE OR REPLACE FUNCTION public.get_all_teams_admin()
RETURNS TABLE(id uuid, name text, credits integer, plan_id text, subscription_status text, created_at timestamp with time zone, subscription_period_end timestamp with time zone, admin_id uuid, code text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'system') THEN
    RAISE EXCEPTION 'Acesso negado: usuário não é administrador do sistema';
  END IF;
  
  RETURN QUERY
  SELECT t.id, t.name, t.credits, t.plan_id, t.subscription_status, 
         t.created_at, t.subscription_period_end, t.admin_id, t.code
  FROM teams t
  ORDER BY t.created_at DESC;
END;
$function$;

-- Atualizar função get_all_users_admin para verificar role 'system'
CREATE OR REPLACE FUNCTION public.get_all_users_admin()
RETURNS TABLE(id uuid, name text, email text, team_id uuid, created_at timestamp with time zone, phone text, state text, city text, avatar_url text, tutorial_completed boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'system') THEN
    RAISE EXCEPTION 'Acesso negado: usuário não é administrador do sistema';
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
$function$;

-- Atualizar políticas RLS que usam 'admin' para usar 'system'
DROP POLICY IF EXISTS "Admins can view all credit history" ON public.credit_history;
CREATE POLICY "System admins can view all credit history" 
ON public.credit_history 
FOR SELECT 
USING (public.has_role(auth.uid(), 'system'));

DROP POLICY IF EXISTS "Admins can read all events" ON public.user_events;
CREATE POLICY "System admins can read all events" 
ON public.user_events 
FOR SELECT 
USING (public.has_role(auth.uid(), 'system'));

DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
CREATE POLICY "System admins can view all roles" 
ON public.user_roles 
FOR SELECT 
USING (public.has_role(auth.uid(), 'system'));

DROP POLICY IF EXISTS "Admins can view all logs" ON public.system_logs;
CREATE POLICY "System admins can view all logs" 
ON public.system_logs 
FOR SELECT 
USING (public.has_role(auth.uid(), 'system'));

DROP POLICY IF EXISTS "Admins can view all actions" ON public.actions;
CREATE POLICY "System admins can view all actions" 
ON public.actions 
FOR SELECT 
USING (public.has_role(auth.uid(), 'system'));

DROP POLICY IF EXISTS "Admins can view all presence history" ON public.user_presence_history;
CREATE POLICY "System admins can view all presence history" 
ON public.user_presence_history 
FOR SELECT 
USING (public.has_role(auth.uid(), 'system'));