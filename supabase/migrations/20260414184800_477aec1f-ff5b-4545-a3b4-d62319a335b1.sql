
-- Remove broad SELECT policies that allow listing all files in public buckets
-- and replace with policies that only allow reading specific files (not listing)

-- Drop existing overly broad SELECT policies for each bucket
DROP POLICY IF EXISTS "Allow public read access to videos" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to videos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view videos" ON storage.objects;
DROP POLICY IF EXISTS "Videos are publicly accessible" ON storage.objects;

DROP POLICY IF EXISTS "Allow public read access to content images" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to content-images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view content images" ON storage.objects;
DROP POLICY IF EXISTS "Content images are publicly accessible" ON storage.objects;

DROP POLICY IF EXISTS "Allow public read access to avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;

DROP POLICY IF EXISTS "Allow public read access to brand avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to brand-avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view brand avatars" ON storage.objects;
DROP POLICY IF EXISTS "Brand avatars are publicly accessible" ON storage.objects;

DROP POLICY IF EXISTS "Allow public read access to creations" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to creations" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view creations" ON storage.objects;
DROP POLICY IF EXISTS "Creations are publicly accessible" ON storage.objects;

DROP POLICY IF EXISTS "Allow public read access to profile banners" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to profile-banners" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view profile banners" ON storage.objects;
DROP POLICY IF EXISTS "Profile banners are publicly accessible" ON storage.objects;

-- Recreate SELECT policies that allow authenticated users to read files in their folder
-- Public buckets still serve files via direct URL, but listing is restricted

CREATE POLICY "Authenticated users can read videos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'videos');

CREATE POLICY "Authenticated users can read content-images"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'content-images');

CREATE POLICY "Authenticated users can read avatars"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "Authenticated users can read brand-avatars"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'brand-avatars');

CREATE POLICY "Authenticated users can read creations"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'creations');

CREATE POLICY "Authenticated users can read profile-banners"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'profile-banners');
