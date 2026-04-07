-- 1. Drop the overly broad profile SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view basic profiles" ON public.profiles;

-- 2. Add a team-scoped SELECT policy: users can see teammates' profiles
CREATE POLICY "Team members can view teammate profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = id
  OR (
    team_id IS NOT NULL
    AND team_id IN (
      SELECT p.team_id FROM public.profiles p WHERE p.id = auth.uid() AND p.team_id IS NOT NULL
    )
  )
);

-- 3. Allow system admins to view all profiles
CREATE POLICY "System admins can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'system'));

-- 4. Fix brand-avatars storage: drop overly permissive delete/update policies and recreate with ownership
DROP POLICY IF EXISTS "Authenticated users can delete brand avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update brand avatars" ON storage.objects;

CREATE POLICY "Users can delete own brand avatars"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'brand-avatars'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update own brand avatars"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'brand-avatars'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);