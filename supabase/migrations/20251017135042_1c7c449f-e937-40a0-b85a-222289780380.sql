-- Reestabelecer créditos do plano enterprise para a equipe LeFil Company
UPDATE public.teams
SET 
  credits_quick_content = 50,
  credits_suggestions = 200,
  credits_reviews = 200,
  credits_plans = 100,
  updated_at = NOW()
WHERE admin_id = 'ecb55ace-66b9-4f69-92fe-977aaa5c7d30'
  AND name = 'LeFil Company'
  AND plan_id = 'enterprise';