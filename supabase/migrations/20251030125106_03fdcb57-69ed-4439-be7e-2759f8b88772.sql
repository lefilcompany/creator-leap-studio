-- ========================================
-- ETAPA 1: ADICIONAR COLUNA credits_videos
-- ========================================

-- 1.1 Adicionar coluna na tabela teams
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS credits_videos INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.teams.credits_videos IS 'Créditos disponíveis para geração de vídeos';

-- 1.2 Adicionar coluna na tabela plans
ALTER TABLE public.plans 
ADD COLUMN IF NOT EXISTS credits_videos INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.plans.credits_videos IS 'Quantidade de créditos de vídeo incluídos no plano';

-- ========================================
-- ETAPA 2: ATUALIZAR VALORES DOS PLANOS
-- ========================================

-- PLANO FREE (7 dias grátis)
UPDATE public.plans
SET 
  trial_days = 7,
  max_members = 2,
  max_brands = 1,
  max_strategic_themes = 2,
  max_personas = 2,
  credits_quick_content = 10,
  credits_suggestions = 5,
  credits_plans = 5,
  credits_reviews = 15,
  credits_videos = 1,
  updated_at = NOW()
WHERE id = 'free';

-- PLANO BASIC (R$ 199,90/mês)
UPDATE public.plans
SET 
  price_monthly = 199.90,
  max_members = 5,
  max_brands = 3,
  max_strategic_themes = 5,
  max_personas = 5,
  credits_quick_content = 15,
  credits_suggestions = 10,
  credits_plans = 15,
  credits_reviews = 25,
  credits_videos = 1,
  updated_at = NOW()
WHERE id = 'basic';

-- PLANO PRO (R$ 99,90/mês)
UPDATE public.plans
SET 
  price_monthly = 99.90,
  max_members = 8,
  max_brands = 6,
  max_strategic_themes = 8,
  max_personas = 10,
  credits_quick_content = 25,
  credits_suggestions = 20,
  credits_plans = 25,
  credits_reviews = 45,
  credits_videos = 2,
  updated_at = NOW()
WHERE id = 'pro';

-- PLANO ENTERPRISE (R$ 499,90/mês)
UPDATE public.plans
SET 
  price_monthly = 499.90,
  max_members = 999999,
  max_brands = 999999,
  max_strategic_themes = 999999,
  max_personas = 999999,
  credits_quick_content = 100,
  credits_suggestions = 50,
  credits_plans = 50,
  credits_reviews = 150,
  credits_videos = 5,
  updated_at = NOW()
WHERE id = 'enterprise';

-- ========================================
-- ETAPA 3: SINCRONIZAR EQUIPES EXISTENTES
-- ========================================

-- Atualizar créditos de vídeo de todas as equipes com base em seus planos
UPDATE public.teams t
SET credits_videos = p.credits_videos
FROM public.plans p
WHERE t.plan_id = p.id;