
-- ============================================
-- 1. FIX can_access_resource: require resource_team_id match
-- ============================================
CREATE OR REPLACE FUNCTION public.can_access_resource(resource_user_id uuid, resource_team_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT 
    -- User owns the resource directly
    resource_user_id = auth.uid()
    OR
    -- Resource has a team_id AND both users are in the same team
    (
      resource_team_id IS NOT NULL
      AND resource_team_id = (SELECT team_id FROM profiles WHERE id = auth.uid())
    )
$function$;

-- ============================================
-- 2. FIX STORAGE: Drop any remaining broad policies
-- ============================================
DROP POLICY IF EXISTS "Authenticated users can upload brand avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update brand avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete brand avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload content images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update content images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete content images" ON storage.objects;

-- Ensure ownership-checked policies exist for brand-avatars (idempotent)
DROP POLICY IF EXISTS "Users can upload own brand avatars" ON storage.objects;
CREATE POLICY "Users can upload own brand avatars"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'brand-avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can update own brand avatars" ON storage.objects;
CREATE POLICY "Users can update own brand avatars"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'brand-avatars' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'brand-avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete own brand avatars" ON storage.objects;
CREATE POLICY "Users can delete own brand avatars"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'brand-avatars' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- Ensure ownership-checked policies exist for content-images (idempotent)
DROP POLICY IF EXISTS "Users can upload own content images" ON storage.objects;
CREATE POLICY "Users can upload own content images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'content-images' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can update own content images" ON storage.objects;
CREATE POLICY "Users can update own content images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'content-images' AND (auth.uid())::text = (storage.foldername(name))[1])
WITH CHECK (bucket_id = 'content-images' AND (auth.uid())::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users can delete own content images" ON storage.objects;
CREATE POLICY "Users can delete own content images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'content-images' AND (auth.uid())::text = (storage.foldername(name))[1]);

-- ============================================
-- 3. FIX PROFILES: Replace broad teammate policy with restricted one
-- ============================================

-- Drop the current broad teammate policy
DROP POLICY IF EXISTS "Team members can view teammate profiles" ON public.profiles;

-- Create a restricted policy that only allows teammates to see non-sensitive fields
-- Since we can't do column-level RLS, we use the teammate_profiles view for lookups
-- and restrict the profiles table SELECT to own row only (+ system admins)
-- The "Users can view their own profile" policy already handles self-access
-- The "System admins can view all profiles" policy handles admin access
-- No additional teammate policy needed on profiles table - use teammate_profiles view instead
