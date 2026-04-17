
-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Users can upload own brand avatars" ON storage.objects;
DROP POLICY IF EXISTS "Owners can update brand-avatars" ON storage.objects;
DROP POLICY IF EXISTS "Owners can delete brand-avatars" ON storage.objects;

-- New policies: allow uploads/updates/deletes when user has access to the brand
-- Path format: {brandId}/...  (first folder = brand id)
CREATE POLICY "Users can upload to accessible brand avatars"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'brand-avatars'
  AND EXISTS (
    SELECT 1 FROM public.brands b
    WHERE b.id::text = (storage.foldername(name))[1]
      AND public.can_access_resource(b.user_id, b.team_id)
  )
);

CREATE POLICY "Users can update accessible brand avatars"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'brand-avatars'
  AND EXISTS (
    SELECT 1 FROM public.brands b
    WHERE b.id::text = (storage.foldername(name))[1]
      AND public.can_access_resource(b.user_id, b.team_id)
  )
);

CREATE POLICY "Users can delete accessible brand avatars"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'brand-avatars'
  AND EXISTS (
    SELECT 1 FROM public.brands b
    WHERE b.id::text = (storage.foldername(name))[1]
      AND public.can_access_resource(b.user_id, b.team_id)
  )
);
