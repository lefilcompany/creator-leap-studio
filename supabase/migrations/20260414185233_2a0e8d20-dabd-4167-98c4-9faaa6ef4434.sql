
-- Fix plans: ensure only authenticated policy exists
DROP POLICY IF EXISTS "Anyone can view active plans" ON public.plans;
DROP POLICY IF EXISTS "Authenticated users can view active plans" ON public.plans;
CREATE POLICY "Authenticated users can view active plans"
  ON public.plans FOR SELECT TO authenticated
  USING (is_active = true);

-- Remove duplicate video upload policy
DROP POLICY IF EXISTS "Usuários autenticados podem fazer upload de vídeos" ON storage.objects;
