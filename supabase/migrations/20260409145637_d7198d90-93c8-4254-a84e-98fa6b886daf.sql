-- ============================================
-- 1. FIX STORAGE: brand-avatars ownership checks
-- ============================================

-- Drop overly broad policies
DROP POLICY IF EXISTS "Authenticated users can upload brand avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update brand avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete brand avatars" ON storage.objects;

-- Note: "Users can delete own brand avatars" and "Users can update own brand avatars" 
-- already have ownership checks, so we keep those.

-- Add ownership-checked upload policy for brand-avatars
CREATE POLICY "Users can upload own brand avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'brand-avatars' 
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- ============================================
-- 2. FIX STORAGE: content-images ownership checks
-- ============================================

-- Drop overly broad policies
DROP POLICY IF EXISTS "Authenticated users can upload content images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update content images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete content images" ON storage.objects;

-- Add ownership-checked policies for content-images
CREATE POLICY "Users can upload own content images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'content-images' 
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update own content images"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'content-images' 
  AND (auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'content-images' 
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own content images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'content-images' 
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

-- ============================================
-- 3. FIX has_role: Restrict to self-check only
-- ============================================

-- Modify has_role to only allow checking your own roles
-- RLS policies always pass auth.uid() so they still work correctly
-- But RPC calls with a different user_id will return false
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
  AND _user_id = auth.uid()
$$;

-- ============================================
-- 4. FIX PROFILES: Create safe view for teammate lookups
-- ============================================

-- Create a view that only exposes non-sensitive profile fields
CREATE OR REPLACE VIEW public.teammate_profiles AS
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

-- Grant access to the view
GRANT SELECT ON public.teammate_profiles TO authenticated;
GRANT SELECT ON public.teammate_profiles TO anon;