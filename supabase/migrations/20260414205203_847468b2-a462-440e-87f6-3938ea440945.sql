
-- Remove sensitive tables from Realtime publication
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'credit_history'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.credit_history;
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'user_presence_history'
  ) THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.user_presence_history;
  END IF;
END $$;

-- Fix duplicate INSERT policies on videos bucket
DROP POLICY IF EXISTS "Usuários autenticados podem fazer upload de vídeos" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload videos" ON storage.objects;

-- Create single INSERT policy with ownership check
CREATE POLICY "Users can upload videos to own folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'videos'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);
