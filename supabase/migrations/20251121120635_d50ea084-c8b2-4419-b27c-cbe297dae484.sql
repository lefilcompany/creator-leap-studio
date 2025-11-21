-- Add onboarding_review_content_completed column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS onboarding_review_content_completed boolean DEFAULT false;