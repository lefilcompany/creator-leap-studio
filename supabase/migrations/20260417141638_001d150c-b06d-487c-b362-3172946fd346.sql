
DROP POLICY IF EXISTS "Users can upload to accessible brand avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update accessible brand avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete accessible brand avatars" ON storage.objects;

CREATE POLICY "Users can upload to accessible brand avatars"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'brand-avatars'
  AND EXISTS (
    SELECT 1 FROM public.brands b
    WHERE b.id::text = (storage.foldername(storage.objects.name))[1]
      AND public.can_access_resource(b.user_id, b.team_id)
  )
);

CREATE POLICY "Users can update accessible brand avatars"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'brand-avatars'
  AND EXISTS (
    SELECT 1 FROM public.brands b
    WHERE b.id::text = (storage.foldername(storage.objects.name))[1]
      AND public.can_access_resource(b.user_id, b.team_id)
  )
);

CREATE POLICY "Users can delete accessible brand avatars"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'brand-avatars'
  AND EXISTS (
    SELECT 1 FROM public.brands b
    WHERE b.id::text = (storage.foldername(storage.objects.name))[1]
      AND public.can_access_resource(b.user_id, b.team_id)
  )
);
