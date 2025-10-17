-- Set force_password_change flag for samuel@gmail.com
UPDATE public.profiles 
SET force_password_change = true 
WHERE email = 'samuel@gmail.com';