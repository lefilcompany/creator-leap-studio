-- Tornar brand_id nullable na tabela actions
-- Isso permite salvar ações que não estão vinculadas a uma marca específica
ALTER TABLE public.actions 
ALTER COLUMN brand_id DROP NOT NULL;