-- Drop the overly permissive coupon SELECT policy
DROP POLICY IF EXISTS "Authenticated users can view active coupons" ON public.coupons;