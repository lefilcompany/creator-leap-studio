-- Atualizar os créditos das equipes com plano free para corresponderem aos limites do plano
UPDATE teams
SET 
  credits_quick_content = 5,
  credits_suggestions = 15,
  credits_plans = 5,
  credits_reviews = 10
WHERE plan_id = 'free';