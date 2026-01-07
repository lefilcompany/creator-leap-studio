-- Fix: Replace overly permissive INSERT policy with service role only
DROP POLICY IF EXISTS "Service role can insert logs" ON public.system_logs;

-- No INSERT policy needed - logs will be inserted via service role key in edge functions
-- which bypasses RLS entirely