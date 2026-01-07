-- Fix: remove overly-permissive RLS policies (WITH CHECK/USING true) that allow privilege escalation

-- credit_purchases
DROP POLICY IF EXISTS "System can insert purchases" ON public.credit_purchases;
DROP POLICY IF EXISTS "System can update purchases" ON public.credit_purchases;

-- credit_history
DROP POLICY IF EXISTS "System can insert credit history" ON public.credit_history;

-- user_roles
DROP POLICY IF EXISTS "System can insert roles" ON public.user_roles;

-- notifications
DROP POLICY IF EXISTS "System can create notifications" ON public.notifications;