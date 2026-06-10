-- RLS para o bucket template-fonts: apenas service_role acessa (cache interno).
-- Sem policies para anon/authenticated: ninguém lê/escreve via cliente.
-- service_role bypassa RLS por padrão, então só precisamos garantir que nenhum acesso público exista.

CREATE POLICY "template-fonts: deny all to anon"
  ON storage.objects FOR SELECT TO anon
  USING (false);

CREATE POLICY "template-fonts: deny all to authenticated"
  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id <> 'template-fonts')
  WITH CHECK (bucket_id <> 'template-fonts');