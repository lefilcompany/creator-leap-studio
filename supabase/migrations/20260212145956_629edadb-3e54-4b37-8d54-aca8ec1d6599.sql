
-- Create storage bucket for profile banners
INSERT INTO storage.buckets (id, name, public) VALUES ('profile-banners', 'profile-banners', true);

-- Allow authenticated users to upload their own banner
CREATE POLICY "Users can upload their own banner"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'profile-banners' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to update their own banner
CREATE POLICY "Users can update their own banner"
ON storage.objects FOR UPDATE
USING (bucket_id = 'profile-banners' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow authenticated users to delete their own banner
CREATE POLICY "Users can delete their own banner"
ON storage.objects FOR DELETE
USING (bucket_id = 'profile-banners' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow public access to profile banners
CREATE POLICY "Profile banners are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'profile-banners');

-- Add banner_url column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banner_url text;
