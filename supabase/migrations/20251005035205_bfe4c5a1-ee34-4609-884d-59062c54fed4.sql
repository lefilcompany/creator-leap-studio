-- Criar bucket de storage para vídeos se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;

-- Criar políticas de acesso ao bucket de vídeos
CREATE POLICY "Videos são públicos para visualização"
ON storage.objects FOR SELECT
USING (bucket_id = 'videos');

CREATE POLICY "Usuários autenticados podem fazer upload de vídeos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'videos');

-- Adicionar tipo de ação para vídeo
DO $$ 
BEGIN
  -- Verificar se o tipo já existe
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'action_type'
  ) THEN
    -- Criar o enum se não existir
    CREATE TYPE action_type AS ENUM ('CRIAR_CONTEUDO', 'CRIAR_CONTEUDO_RAPIDO', 'REVISAR_CONTEUDO', 'PLANEJAR_CONTEUDO', 'GERAR_VIDEO');
  ELSE
    -- Adicionar novo valor ao enum existente se não estiver presente
    BEGIN
      ALTER TYPE action_type ADD VALUE IF NOT EXISTS 'GERAR_VIDEO';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END;
  END IF;
END $$;