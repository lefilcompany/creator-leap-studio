
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS max_credits integer DEFAULT 0;

-- Set max_credits to current credits for all existing users
UPDATE public.profiles SET max_credits = COALESCE(credits, 0) WHERE max_credits IS NULL OR max_credits = 0;
