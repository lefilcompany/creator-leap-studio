
-- Remover role de admin de todos os usuários EXCETO admin@admin.com
DELETE FROM public.user_roles ur
USING public.profiles p
WHERE ur.user_id = p.id 
  AND ur.role = 'admin'
  AND p.email != 'admin@admin.com';
