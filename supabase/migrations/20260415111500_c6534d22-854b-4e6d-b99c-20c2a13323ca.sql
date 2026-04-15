
-- Remove broad delete/update policies on content-images that lack ownership checks
DROP POLICY IF EXISTS "Authenticated users can delete content images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update content images" ON storage.objects;
