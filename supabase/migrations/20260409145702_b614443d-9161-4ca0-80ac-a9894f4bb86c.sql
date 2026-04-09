-- Recreate the view with SECURITY INVOKER (default, but explicit)
DROP VIEW IF EXISTS public.teammate_profiles;

CREATE VIEW public.teammate_profiles 
WITH (security_invoker = true)
AS
SELECT 
  id,
  name,
  email,
  avatar_url,
  banner_url,
  team_id,
  created_at,
  tutorial_completed,
  phone,
  city,
  state
FROM public.profiles;

-- Grant access
GRANT SELECT ON public.teammate_profiles TO authenticated;
GRANT SELECT ON public.teammate_profiles TO anon;