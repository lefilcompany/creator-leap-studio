-- ========================================
-- ATUALIZAÇÃO DOS PLANOS DO CREATOR
-- Renomeação Free → Light e ajuste de valores
-- ========================================

-- PLANO LIGHT (antigo Free)
-- Agora com preço R$ 109,90 e assinável online com 7 dias de trial
UPDATE public.plans
SET 
  name = 'Light',
  price_monthly = 109.90,
  can_subscribe_online = true,
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
  description = 'Plano inicial para experimentar o Creator com 7 dias gratuitos',
  features = jsonb_build_array(
    '2 Membros',
    '1 Marca',
    '2 Temas Estratégicos',
    '2 Personas',
    '10 Criação de Conteúdos rápidos',
    '5 Criação de Conteúdos personalizados',
    '5 Planejamento de Conteúdos',
    '15 Revisões de Conteúdos',
    '1 Vídeo'
  ),
  updated_at = NOW()
WHERE id = 'free';

-- PLANO BÁSICO (R$ 249,90/mês)
UPDATE public.plans
SET 
  name = 'Básico',
  price_monthly = 249.90,
  can_subscribe_online = true,
  trial_days = 0,
  max_members = 5,
  max_brands = 3,
  max_strategic_themes = 5,
  max_personas = 5,
  credits_quick_content = 15,
  credits_suggestions = 10,
  credits_plans = 15,
  credits_reviews = 25,
  credits_videos = 2,
  description = 'Plano ideal para pequenas equipes e negócios em crescimento',
  features = jsonb_build_array(
    '5 Membros',
    '3 Marcas',
    '5 Temas Estratégicos',
    '5 Personas',
    '15 Criação de Conteúdos rápidos',
    '10 Criação de Conteúdos personalizados',
    '15 Planejamento de Conteúdos',
    '25 Revisões de Conteúdos',
    '2 Vídeos'
  ),
  updated_at = NOW()
WHERE id = 'basic';

-- PLANO PRO (R$ 549,90/mês)
UPDATE public.plans
SET 
  name = 'Pro',
  price_monthly = 549.90,
  can_subscribe_online = true,
  trial_days = 0,
  max_members = 8,
  max_brands = 6,
  max_strategic_themes = 8,
  max_personas = 10,
  credits_quick_content = 25,
  credits_suggestions = 20,
  credits_plans = 25,
  credits_reviews = 45,
  credits_videos = 5,
  description = 'Plano profissional para equipes que precisam de mais recursos',
  features = jsonb_build_array(
    '8 Membros',
    '6 Marcas',
    '8 Temas Estratégicos',
    '10 Personas',
    '25 Criação de Conteúdos rápidos',
    '20 Criação de Conteúdos personalizados',
    '25 Planejamento de Conteúdos',
    '45 Revisões de Conteúdos',
    '5 Vídeos'
  ),
  updated_at = NOW()
WHERE id = 'pro';

-- PLANO ENTERPRISE (Sob consulta)
-- Não assinável online - apenas via WhatsApp
UPDATE public.plans
SET 
  name = 'Enterprise',
  price_monthly = 0.00,
  can_subscribe_online = false,
  trial_days = 0,
  max_members = 999999,
  max_brands = 999999,
  max_strategic_themes = 999999,
  max_personas = 999999,
  credits_quick_content = 999999,
  credits_suggestions = 999999,
  credits_plans = 999999,
  credits_reviews = 999999,
  credits_videos = 999999,
  description = 'Plano empresarial personalizado com atendimento especializado',
  features = jsonb_build_array(
    'Apoio para construir uma estratégia personalizada',
    'Acompanhamento durante toda a jornada',
    'Recursos avançados de IA para gerar mais oportunidades',
    'Atendimento com especialista técnico e estratégico disponível por videochamada',
    'Gerente de Sucesso do Cliente dedicado',
    'Atendimento por chat e e-mail com prioridade',
    'Treinamento com colaboradores para uso da plataforma'
  ),
  updated_at = NOW()
WHERE id = 'enterprise';