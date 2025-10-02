-- Remover TODAS as políticas problemáticas que causam recursão
DROP POLICY IF EXISTS "Team members can view each other's profiles" ON public.profiles;
DROP POLICY IF EXISTS "Team admins can view profiles of users with pending join requests" ON public.profiles;

-- Manter apenas as políticas básicas e seguras que NÃO causam recursão:

-- 1. Usuários podem ver seu próprio perfil (já existe)
-- Esta política já existe: "Users can view their own profile"

-- 2. NOVA: Permitir que qualquer usuário autenticado veja perfis básicos
-- Isso é necessário para que admins vejam perfis de solicitantes
CREATE POLICY "Authenticated users can view basic profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);

-- Se você quiser mais segurança, pode limitar aos campos específicos
-- mas isso exigiria uma view separada