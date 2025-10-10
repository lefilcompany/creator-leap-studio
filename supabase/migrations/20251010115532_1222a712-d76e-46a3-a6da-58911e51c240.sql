-- Adicionar foreign key entre actions.user_id e profiles.id
ALTER TABLE public.actions
ADD CONSTRAINT actions_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- Criar índice para melhorar performance nas consultas
CREATE INDEX IF NOT EXISTS idx_actions_user_id ON public.actions(user_id);