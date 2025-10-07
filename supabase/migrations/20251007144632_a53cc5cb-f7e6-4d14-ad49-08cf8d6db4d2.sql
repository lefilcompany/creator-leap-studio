-- Reset password for emanuel.rodrigues1@lefil.com.br
-- This updates the password hash directly in auth.users
UPDATE auth.users
SET 
  encrypted_password = crypt('123456', gen_salt('bf')),
  updated_at = now()
WHERE email = 'emanuel.rodrigues1@lefil.com.br';