INSERT INTO storage.buckets (id, name, public)
VALUES ('persona-avatars', 'persona-avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public can view persona avatars"
ON storage.objects FOR SELECT
USING (bucket_id = 'persona-avatars');

CREATE POLICY "Service role can manage persona avatars"
ON storage.objects FOR ALL
USING (bucket_id = 'persona-avatars' AND auth.role() = 'service_role');