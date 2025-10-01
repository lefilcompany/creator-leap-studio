-- Criar tabela de planos
CREATE TABLE IF NOT EXISTS public.plans (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text,
  price_monthly numeric(10,2) NOT NULL,
  price_yearly numeric(10,2),
  stripe_price_id_monthly text,
  stripe_price_id_yearly text,
  stripe_product_id text,
  credits_quick_content integer NOT NULL DEFAULT 0,
  credits_plans integer NOT NULL DEFAULT 0,
  credits_suggestions integer NOT NULL DEFAULT 0,
  credits_reviews integer NOT NULL DEFAULT 0,
  features jsonb,
  is_active boolean DEFAULT true,
  can_subscribe_online boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

-- Política: Todos podem visualizar planos ativos
CREATE POLICY "Anyone can view active plans"
ON public.plans
FOR SELECT
USING (is_active = true);

-- Inserir planos padrão
INSERT INTO public.plans (id, name, description, price_monthly, price_yearly, credits_quick_content, credits_plans, credits_suggestions, credits_reviews, can_subscribe_online, features) VALUES
('free', 'Free', 'Plano gratuito para começar', 0, 0, 100, 10, 50, 20, false, '["1 marca", "Recursos básicos", "Suporte por email"]'::jsonb),
('basic', 'Basic', 'Para criadores iniciantes', 29.90, 299, 500, 50, 200, 100, true, '["3 marcas", "Todos os recursos", "Suporte prioritário", "Análises básicas"]'::jsonb),
('pro', 'Pro', 'Para criadores profissionais', 79.90, 799, 2000, 200, 1000, 500, true, '["10 marcas", "Recursos avançados", "Suporte 24/7", "Análises avançadas", "API access"]'::jsonb),
('enterprise', 'Enterprise', 'Para agências e equipes grandes', 0, 0, 10000, 1000, 5000, 2000, false, '["Marcas ilimitadas", "Recursos personalizados", "Gerente de conta dedicado", "SLA garantido", "Integrações customizadas"]'::jsonb);

-- Adicionar foreign key na tabela teams
ALTER TABLE public.teams 
DROP CONSTRAINT IF EXISTS teams_plan_id_fkey;

ALTER TABLE public.teams
ADD CONSTRAINT teams_plan_id_fkey 
FOREIGN KEY (plan_id) 
REFERENCES public.plans(id)
ON DELETE RESTRICT;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_plans_updated_at
BEFORE UPDATE ON public.plans
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar campos de assinatura Stripe na tabela teams
ALTER TABLE public.teams
ADD COLUMN IF NOT EXISTS stripe_customer_id text,
ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
ADD COLUMN IF NOT EXISTS subscription_status text,
ADD COLUMN IF NOT EXISTS subscription_period_end timestamp with time zone;