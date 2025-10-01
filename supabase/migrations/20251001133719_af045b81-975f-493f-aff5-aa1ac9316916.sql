-- Adicionar colunas ausentes na tabela plans
ALTER TABLE plans ADD COLUMN IF NOT EXISTS max_members integer NOT NULL DEFAULT 0;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS max_brands integer NOT NULL DEFAULT 0;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS max_strategic_themes integer NOT NULL DEFAULT 0;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS max_personas integer NOT NULL DEFAULT 0;
ALTER TABLE plans ADD COLUMN IF NOT EXISTS trial_days integer NOT NULL DEFAULT 0;

-- Atualizar plano Free (7 dias gratuitos)
UPDATE plans SET 
  credits_quick_content = 5,
  credits_suggestions = 15,
  credits_plans = 5,
  credits_reviews = 10,
  max_members = 5,
  max_brands = 1,
  max_strategic_themes = 3,
  max_personas = 3,
  trial_days = 7,
  description = 'Plano gratuito por 7 dias para experimentar o Creator',
  features = jsonb_build_array(
    '5 Membros',
    '1 Marca',
    '3 Temas Estratégicos',
    '3 Personas',
    '5 Criação de Conteúdos rápidos',
    '15 Criação de Conteúdos personalizados',
    '5 Planejamento de Conteúdos',
    '10 Revisões de Conteúdos'
  )
WHERE id = 'free';

-- Atualizar plano Basic
UPDATE plans SET 
  credits_quick_content = 7,
  credits_suggestions = 20,
  credits_plans = 7,
  credits_reviews = 15,
  max_members = 10,
  max_brands = 5,
  max_strategic_themes = 15,
  max_personas = 15,
  trial_days = 0,
  description = 'Plano ideal para pequenas equipes e negócios em crescimento',
  features = jsonb_build_array(
    '10 Membros',
    '5 Marcas',
    '15 Temas Estratégicos',
    '15 Personas',
    '7 Criação de Conteúdos rápidos',
    '20 Criação de Conteúdos personalizados',
    '7 Planejamento de Conteúdos',
    '15 Revisões de Conteúdos'
  )
WHERE id = 'basic';

-- Atualizar plano Pro
UPDATE plans SET 
  credits_quick_content = 10,
  credits_suggestions = 30,
  credits_plans = 10,
  credits_reviews = 25,
  max_members = 20,
  max_brands = 10,
  max_strategic_themes = 30,
  max_personas = 30,
  trial_days = 0,
  description = 'Plano profissional para equipes que precisam de mais recursos',
  features = jsonb_build_array(
    '20 Membros',
    '10 Marcas',
    '30 Temas Estratégicos',
    '30 Personas',
    '10 Criação de Conteúdos rápidos',
    '30 Criação de Conteúdos personalizados',
    '10 Planejamento de Conteúdos',
    '25 Revisões de Conteúdos'
  )
WHERE id = 'pro';

-- Atualizar plano Enterprise (apenas este tem integrações avançadas)
UPDATE plans SET 
  credits_quick_content = 50,
  credits_suggestions = 200,
  credits_plans = 100,
  credits_reviews = 200,
  max_members = 999999,
  max_brands = 999999,
  max_strategic_themes = 999999,
  max_personas = 999999,
  trial_days = 0,
  description = 'Plano empresarial com recursos ilimitados e integrações avançadas',
  features = jsonb_build_array(
    'Membros Ilimitados',
    'Marcas Ilimitadas',
    'Temas Estratégicos Ilimitados',
    'Personas Ilimitadas',
    '50+ Criação de Conteúdos rápidos',
    '200+ Criação de Conteúdos personalizados',
    '100+ Planejamento de Conteúdos',
    '200+ Revisões de Conteúdos',
    'Integrações avançadas'
  )
WHERE id = 'enterprise';