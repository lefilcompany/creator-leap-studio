
-- Remove remaining public/broad SELECT policies
DROP POLICY IF EXISTS "Public can view content images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view videos" ON storage.objects;
DROP POLICY IF EXISTS "Users can view all avatars" ON storage.objects;
DROP POLICY IF EXISTS "Videos são públicos para visualização" ON storage.objects;

-- Also clean up duplicate owner policies from previous migration
DROP POLICY IF EXISTS "Users can delete own brand avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own content images" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own brand avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own content images" ON storage.objects;
DROP POLICY IF EXISTS "Owners can delete brand avatars" ON storage.objects;
DROP POLICY IF EXISTS "Owners can update brand avatars" ON storage.objects;
DROP POLICY IF EXISTS "Owners can delete content images" ON storage.objects;
DROP POLICY IF EXISTS "Owners can update content images" ON storage.objects;
DROP POLICY IF EXISTS "Owners can delete creations" ON storage.objects;
DROP POLICY IF EXISTS "Owners can update creations" ON storage.objects;

-- Recreate clean owner-scoped delete/update for brand-avatars, content-images, creations
CREATE POLICY "Owners can delete brand-avatars"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'brand-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owners can update brand-avatars"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'brand-avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owners can delete content-images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'content-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owners can update content-images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'content-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owners can delete creations"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'creations' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Owners can update creations"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'creations' AND auth.uid()::text = (storage.foldername(name))[1]);
