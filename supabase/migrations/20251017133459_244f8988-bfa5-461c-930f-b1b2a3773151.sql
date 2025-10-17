-- Add force_password_change column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN force_password_change boolean DEFAULT false;

-- Set the flag for the specific user
UPDATE public.profiles 
SET force_password_change = true 
WHERE email = 'heloyanya@gmail.com';