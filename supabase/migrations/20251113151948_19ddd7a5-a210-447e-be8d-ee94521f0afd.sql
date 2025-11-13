-- MIGRATION COMPLETA: Sistema de Créditos Unificado

-- PASSO 1: Adicionar coluna credits à tabela plans
ALTER TABLE plans ADD COLUMN IF NOT EXISTS credits INTEGER NOT NULL DEFAULT 0;

-- PASSO 2: Inserir novos planos com IDs únicos
INSERT INTO plans (
  id, name, description, credits, price_monthly, max_members, 
  max_brands, max_strategic_themes, max_personas, trial_days, 
  is_active, can_subscribe_online
) VALUES
  ('pack_starter', 'Starter', 'Pacote inicial com 20 créditos. Até 10 membros. 3 marcas/personas/temas gratuitos.', 20, 39.90, 10, 3, 3, 3, 0, true, true),
  ('pack_basic', 'Basic', 'Pacote básico com 40 créditos. Até 20 membros. 3 marcas/personas/temas gratuitos.', 40, 74.90, 20, 3, 3, 3, 0, true, true),
  ('pack_pro', 'Pro', 'Pacote profissional com 80 créditos. Até 40 membros. 3 marcas/personas/temas gratuitos.', 80, 149.90, 40, 3, 3, 3, 0, true, true),
  ('pack_premium', 'Premium', 'Pacote premium com 160 créditos. Até 40 membros. 3 marcas/personas/temas gratuitos.', 160, 299.90, 40, 3, 3, 3, 0, true, true),
  ('pack_business', 'Business', 'Pacote empresarial com 320 créditos. Até 60 membros. 3 marcas/personas/temas gratuitos.', 320, 599.90, 60, 3, 3, 3, 0, true, true),
  ('pack_enterprise', 'Enterprise', 'Pacote enterprise com 640 créditos. Até 60 membros. 3 marcas/personas/temas gratuitos.', 640, 1199.90, 60, 3, 3, 3, 0, true, true),
  ('pack_trial', 'Trial Gratuito', 'Trial gratuito com 20 créditos. Até 10 membros. 3 marcas/personas/temas gratuitos.', 20, 0, 10, 3, 3, 3, 7, true, false)
ON CONFLICT (id) DO NOTHING;

-- PASSO 3: Preparar teams - adicionar coluna de créditos temporária
ALTER TABLE teams ADD COLUMN IF NOT EXISTS credits_temp INTEGER DEFAULT 0;

-- Somar todos os créditos antigos
UPDATE teams
SET credits_temp = COALESCE(credits_quick_content, 0) + 
                   COALESCE(credits_suggestions, 0) + 
                   COALESCE(credits_plans, 0) + 
                   COALESCE(credits_reviews, 0) + 
                   COALESCE(credits_videos, 0);

-- PASSO 4: Adicionar contadores de recursos gratuitos
ALTER TABLE teams
  ADD COLUMN IF NOT EXISTS free_brands_used INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS free_personas_used INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS free_themes_used INTEGER DEFAULT 0;

UPDATE teams t SET free_brands_used = LEAST(3, (SELECT COUNT(*) FROM brands WHERE team_id = t.id));
UPDATE teams t SET free_personas_used = LEAST(3, (SELECT COUNT(*) FROM personas WHERE team_id = t.id));
UPDATE teams t SET free_themes_used = LEAST(3, (SELECT COUNT(*) FROM strategic_themes WHERE team_id = t.id));

-- PASSO 5: Migrar plan_id para os novos planos
UPDATE teams SET plan_id = 'pack_trial' WHERE plan_id = 'free';
UPDATE teams SET plan_id = 'pack_basic' WHERE plan_id = 'basic';
UPDATE teams SET plan_id = 'pack_pro' WHERE plan_id = 'pro';
UPDATE teams SET plan_id = 'pack_enterprise' WHERE plan_id = 'enterprise';

-- PASSO 6: Deletar planos antigos
DELETE FROM plans WHERE id IN ('free', 'basic', 'pro', 'enterprise');

-- PASSO 7: Remover colunas antigas de créditos
ALTER TABLE plans 
  DROP COLUMN IF EXISTS credits_quick_content,
  DROP COLUMN IF EXISTS credits_suggestions,
  DROP COLUMN IF EXISTS credits_plans,
  DROP COLUMN IF EXISTS credits_reviews,
  DROP COLUMN IF EXISTS credits_videos;

ALTER TABLE teams
  DROP COLUMN IF EXISTS credits_quick_content,
  DROP COLUMN IF EXISTS credits_suggestions,
  DROP COLUMN IF EXISTS credits_plans,
  DROP COLUMN IF EXISTS credits_reviews,
  DROP COLUMN IF EXISTS credits_videos;

-- PASSO 8: Renomear credits_temp para credits
ALTER TABLE teams RENAME COLUMN credits_temp TO credits;

-- PASSO 9: Dar créditos mínimos para planos pagos
UPDATE teams SET credits = GREATEST(credits, 40)
WHERE plan_id IN ('pack_basic', 'pack_pro', 'pack_premium', 'pack_business', 'pack_enterprise');