
-- 1. Restrict creations bucket uploads to user's own folder (path-scoped)
DROP POLICY IF EXISTS "Authenticated users can upload creations" ON storage.objects;
CREATE POLICY "Users can upload creations to own folder"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'creations'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- 2. Prevent duplicate credit_purchases for same Stripe session
CREATE UNIQUE INDEX IF NOT EXISTS credit_purchases_session_unique
  ON public.credit_purchases (stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;
