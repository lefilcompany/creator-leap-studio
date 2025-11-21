-- Adicionar colunas para controlar os tours específicos de cada tipo de revisão
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_review_content_image_completed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_review_content_caption_completed boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS onboarding_review_content_text_completed boolean DEFAULT false;