-- Add migration tracking fields to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS migration_user boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS password_reset_sent_at timestamp with time zone DEFAULT NULL;

-- Create index for better performance when querying migration users
CREATE INDEX IF NOT EXISTS idx_profiles_migration_user 
ON public.profiles(migration_user) 
WHERE migration_user = true;

-- Update existing users to mark them as migration users if they were created during migration period
-- This helps identify users who need password reset
UPDATE public.profiles 
SET migration_user = true 
WHERE created_at < NOW() 
AND password_reset_sent_at IS NULL;