-- Criar políticas RLS permissivas para o bucket content-images
-- Todos usuários autenticados podem fazer operações

-- 1. SELECT: Público pode visualizar imagens
CREATE POLICY "Public can view content images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'content-images');

-- 2. INSERT: Usuários autenticados podem fazer upload
CREATE POLICY "Authenticated users can upload content images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'content-images');

-- 3. UPDATE: Usuários autenticados podem atualizar arquivos
CREATE POLICY "Authenticated users can update content images"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'content-images')
WITH CHECK (bucket_id = 'content-images');

-- 4. DELETE: Usuários autenticados podem deletar arquivos
CREATE POLICY "Authenticated users can delete content images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'content-images');