-- Criar tabela de notificações
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Criar tabela de solicitações de entrada na equipe
CREATE TABLE IF NOT EXISTS public.team_join_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  message text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamp with time zone,
  UNIQUE(team_id, user_id)
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_team_join_requests_team_id ON public.team_join_requests(team_id);
CREATE INDEX IF NOT EXISTS idx_team_join_requests_user_id ON public.team_join_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_team_join_requests_status ON public.team_join_requests(status);

-- RLS para notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON public.notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
  ON public.notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
  ON public.notifications
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can delete their own notifications"
  ON public.notifications
  FOR DELETE
  USING (auth.uid() = user_id);

-- RLS para team_join_requests
ALTER TABLE public.team_join_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view join requests they created"
  ON public.team_join_requests
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Team admins can view their team's join requests"
  ON public.team_join_requests
  FOR SELECT
  USING (
    team_id IN (
      SELECT id FROM public.teams WHERE admin_id = auth.uid()
    )
  );

CREATE POLICY "Users can create join requests"
  ON public.team_join_requests
  FOR INSERT
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Team admins can update join requests"
  ON public.team_join_requests
  FOR UPDATE
  USING (
    team_id IN (
      SELECT id FROM public.teams WHERE admin_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their pending join requests"
  ON public.team_join_requests
  FOR DELETE
  USING (auth.uid() = user_id AND status = 'pending');

-- Trigger para atualizar updated_at
CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_team_join_requests_updated_at
  BEFORE UPDATE ON public.team_join_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Função para criar notificação quando um join request é criado
CREATE OR REPLACE FUNCTION public.notify_team_admin_on_join_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_id uuid;
  user_name text;
  team_name text;
BEGIN
  -- Buscar admin_id e nome do time
  SELECT t.admin_id, t.name INTO admin_id, team_name
  FROM public.teams t
  WHERE t.id = NEW.team_id;
  
  -- Buscar nome do usuário
  SELECT p.name INTO user_name
  FROM public.profiles p
  WHERE p.id = NEW.user_id;
  
  -- Criar notificação para o admin
  INSERT INTO public.notifications (user_id, team_id, type, title, message, metadata)
  VALUES (
    admin_id,
    NEW.team_id,
    'team_join_request',
    'Nova solicitação de entrada',
    user_name || ' solicitou entrar na equipe ' || team_name,
    jsonb_build_object('join_request_id', NEW.id, 'user_id', NEW.user_id)
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_team_join_request_created
  AFTER INSERT ON public.team_join_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_team_admin_on_join_request();

-- Função para criar notificação quando um join request é aprovado/rejeitado
CREATE OR REPLACE FUNCTION public.notify_user_on_join_request_review()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  team_name text;
  status_text text;
BEGIN
  -- Só notifica se o status mudou de pending
  IF OLD.status = 'pending' AND NEW.status != 'pending' THEN
    -- Buscar nome do time
    SELECT t.name INTO team_name
    FROM public.teams t
    WHERE t.id = NEW.team_id;
    
    -- Definir texto do status
    status_text := CASE 
      WHEN NEW.status = 'approved' THEN 'aprovada'
      ELSE 'rejeitada'
    END;
    
    -- Criar notificação para o usuário
    INSERT INTO public.notifications (user_id, team_id, type, title, message, metadata)
    VALUES (
      NEW.user_id,
      NEW.team_id,
      'team_join_request_' || NEW.status,
      'Solicitação ' || status_text,
      'Sua solicitação para entrar na equipe ' || team_name || ' foi ' || status_text,
      jsonb_build_object('join_request_id', NEW.id, 'status', NEW.status)
    );
    
    -- Se aprovado, adicionar usuário ao time
    IF NEW.status = 'approved' THEN
      UPDATE public.profiles
      SET team_id = NEW.team_id
      WHERE id = NEW.user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_team_join_request_reviewed
  AFTER UPDATE ON public.team_join_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_user_on_join_request_review();