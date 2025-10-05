-- Adicionar 'GERAR_VIDEO' como tipo válido de ação
-- Primeiro, remover a constraint antiga se existir
ALTER TABLE public.actions DROP CONSTRAINT IF EXISTS actions_type_check;

-- Adicionar a nova constraint com todos os tipos válidos
ALTER TABLE public.actions ADD CONSTRAINT actions_type_check 
  CHECK (type IN ('CRIAR_CONTEUDO', 'CRIAR_CONTEUDO_RAPIDO', 'REVISAR_CONTEUDO', 'PLANEJAR_CONTEUDO', 'GERAR_VIDEO'));