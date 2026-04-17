ALTER TABLE public.persona_templates ADD COLUMN IF NOT EXISTS income_and_purchase_habits text;
ALTER TABLE public.personas ADD COLUMN IF NOT EXISTS income_and_purchase_habits text;