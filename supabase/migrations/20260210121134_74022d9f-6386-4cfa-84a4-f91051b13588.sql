
-- Add avatar_url column to brands table
ALTER TABLE public.brands ADD COLUMN avatar_url text;

-- Create brand-avatars storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-avatars', 'brand-avatars', true);

-- RLS policies for brand-avatars bucket
CREATE POLICY "Brand avatars are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'brand-avatars');

CREATE POLICY "Authenticated users can upload brand avatars"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'brand-avatars');

CREATE POLICY "Authenticated users can update brand avatars"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'brand-avatars');

CREATE POLICY "Authenticated users can delete brand avatars"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'brand-avatars');
