-- Remove tabelas antigas que serão substituídas pela tabela actions
DROP TABLE IF EXISTS public.content_revisions CASCADE;
DROP TABLE IF EXISTS public.content_generations CASCADE;