-- Fase 1: Adicionar campos de créditos/plano ao profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS credits integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS plan_id text DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_status text,
ADD COLUMN IF NOT EXISTS subscription_period_end timestamptz,
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

-- Criar tabela de membros de equipe para compartilhamento opcional
CREATE TABLE IF NOT EXISTS public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(team_id, user_id)
);

-- Habilitar RLS na nova tabela
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Policies para team_members
CREATE POLICY "Users can view team memberships they belong to"
ON public.team_members FOR SELECT
USING (
  user_id = auth.uid() 
  OR 
  team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
);

CREATE POLICY "Team admins can manage members"
ON public.team_members FOR ALL
USING (
  team_id IN (
    SELECT id FROM public.teams WHERE admin_id = auth.uid()
  )
);

CREATE POLICY "Users can leave teams"
ON public.team_members FOR DELETE
USING (user_id = auth.uid());

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON public.team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON public.team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_profiles_plan_id ON public.profiles(plan_id);
CREATE INDEX IF NOT EXISTS idx_profiles_subscription_status ON public.profiles(subscription_status);

-- Migrar dados: copiar créditos e plano do team para o admin do time
UPDATE public.profiles p
SET 
  credits = COALESCE(t.credits, 0),
  plan_id = COALESCE(t.plan_id, 'free'),
  subscription_status = t.subscription_status,
  subscription_period_end = t.subscription_period_end,
  stripe_customer_id = t.stripe_customer_id,
  stripe_subscription_id = t.stripe_subscription_id
FROM public.teams t
WHERE p.id = t.admin_id;

-- Popular team_members com admins existentes
INSERT INTO public.team_members (team_id, user_id, role)
SELECT id, admin_id, 'admin'
FROM public.teams
ON CONFLICT (team_id, user_id) DO NOTHING;

-- Adicionar membros existentes (usuários que têm team_id no profile)
INSERT INTO public.team_members (team_id, user_id, role)
SELECT p.team_id, p.id, 'member'
FROM public.profiles p
WHERE p.team_id IS NOT NULL
ON CONFLICT (team_id, user_id) DO NOTHING;