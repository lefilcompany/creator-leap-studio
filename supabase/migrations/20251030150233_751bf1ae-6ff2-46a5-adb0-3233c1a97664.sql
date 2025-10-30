-- Atualizar Stripe IDs para o plano Light
UPDATE public.plans
SET 
  stripe_product_id = 'prod_TKcbCMm4kuDoLi',
  stripe_price_id_monthly = 'price_1SNxMDAGsH8eqXqHVlgIxPS6',
  updated_at = NOW()
WHERE id = 'free';