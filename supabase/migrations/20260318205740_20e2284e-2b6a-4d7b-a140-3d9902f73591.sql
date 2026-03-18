
-- Table to store coupon definitions created by system admins
CREATE TABLE public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  prefix text NOT NULL,
  prize_type text NOT NULL DEFAULT 'credits',
  prize_value integer NOT NULL,
  max_uses integer DEFAULT NULL,
  uses_count integer NOT NULL DEFAULT 0,
  expires_at timestamp with time zone DEFAULT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

-- System admins can do everything
CREATE POLICY "System admins can manage coupons"
  ON public.coupons FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'system'))
  WITH CHECK (public.has_role(auth.uid(), 'system'));

-- Anyone authenticated can read active coupons (needed for redemption)
CREATE POLICY "Authenticated users can view active coupons"
  ON public.coupons FOR SELECT
  TO authenticated
  USING (is_active = true);
