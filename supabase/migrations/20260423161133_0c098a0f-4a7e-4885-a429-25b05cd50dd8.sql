
-- Bucket privado para armazenar snapshots de cada etapa do pipeline (debug)
INSERT INTO storage.buckets (id, name, public)
VALUES ('debug-snapshots', 'debug-snapshots', false)
ON CONFLICT (id) DO NOTHING;

-- Apenas o próprio usuário (pasta = user_id) ou admin do sistema pode ler
DROP POLICY IF EXISTS "Owner can read debug snapshots" ON storage.objects;
CREATE POLICY "Owner can read debug snapshots"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'debug-snapshots'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'system'::app_role)
    OR public.has_role(auth.uid(), 'admin'::app_role)
  )
);

-- Inserts são feitos via service-role (edge functions); nenhum policy de INSERT necessário.
