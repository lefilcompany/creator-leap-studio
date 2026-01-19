-- =====================================================
-- Migration: Update RLS Policies for User-Centric Model
-- =====================================================
-- Allows access by user_id OR team_id for content tables
-- Makes team_id optional (nullable) in content tables
-- Updates credit-related policies to use user_id as primary

-- =====================================================
-- 1. Make team_id nullable in content tables
-- =====================================================

ALTER TABLE public.brands ALTER COLUMN team_id DROP NOT NULL;
ALTER TABLE public.personas ALTER COLUMN team_id DROP NOT NULL;
ALTER TABLE public.strategic_themes ALTER COLUMN team_id DROP NOT NULL;
ALTER TABLE public.actions ALTER COLUMN team_id DROP NOT NULL;
ALTER TABLE public.credit_history ALTER COLUMN team_id DROP NOT NULL;
ALTER TABLE public.credit_purchases ALTER COLUMN team_id DROP NOT NULL;
ALTER TABLE public.coupons_used ALTER COLUMN team_id DROP NOT NULL;

-- =====================================================
-- 2. Create helper function for user/team access check
-- =====================================================

CREATE OR REPLACE FUNCTION public.can_access_resource(resource_user_id uuid, resource_team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    -- User owns the resource directly
    resource_user_id = auth.uid()
    OR
    -- User is part of the same team (if team exists)
    (
      resource_team_id IS NOT NULL 
      AND resource_team_id IN (
        SELECT team_id FROM profiles WHERE id = auth.uid() AND team_id IS NOT NULL
      )
    )
$$;

-- =====================================================
-- 3. Update BRANDS policies
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their team's brands" ON public.brands;
DROP POLICY IF EXISTS "Users can create brands for their team" ON public.brands;
DROP POLICY IF EXISTS "Users can update their team's brands" ON public.brands;
DROP POLICY IF EXISTS "Users can delete their team's brands" ON public.brands;

-- Create new policies with user OR team access
CREATE POLICY "Users can view own or team brands"
ON public.brands FOR SELECT
USING (public.can_access_resource(user_id, team_id));

CREATE POLICY "Users can create brands"
ON public.brands FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own or team brands"
ON public.brands FOR UPDATE
USING (public.can_access_resource(user_id, team_id));

CREATE POLICY "Users can delete own or team brands"
ON public.brands FOR DELETE
USING (public.can_access_resource(user_id, team_id));

-- =====================================================
-- 4. Update PERSONAS policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view their team's personas" ON public.personas;
DROP POLICY IF EXISTS "Users can create personas for their team" ON public.personas;
DROP POLICY IF EXISTS "Users can update their team's personas" ON public.personas;
DROP POLICY IF EXISTS "Users can delete their team's personas" ON public.personas;

CREATE POLICY "Users can view own or team personas"
ON public.personas FOR SELECT
USING (public.can_access_resource(user_id, team_id));

CREATE POLICY "Users can create personas"
ON public.personas FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own or team personas"
ON public.personas FOR UPDATE
USING (public.can_access_resource(user_id, team_id));

CREATE POLICY "Users can delete own or team personas"
ON public.personas FOR DELETE
USING (public.can_access_resource(user_id, team_id));

-- =====================================================
-- 5. Update STRATEGIC_THEMES policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view their team's themes" ON public.strategic_themes;
DROP POLICY IF EXISTS "Users can create themes for their team" ON public.strategic_themes;
DROP POLICY IF EXISTS "Users can update their team's themes" ON public.strategic_themes;
DROP POLICY IF EXISTS "Users can delete their team's themes" ON public.strategic_themes;

CREATE POLICY "Users can view own or team themes"
ON public.strategic_themes FOR SELECT
USING (public.can_access_resource(user_id, team_id));

CREATE POLICY "Users can create themes"
ON public.strategic_themes FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own or team themes"
ON public.strategic_themes FOR UPDATE
USING (public.can_access_resource(user_id, team_id));

CREATE POLICY "Users can delete own or team themes"
ON public.strategic_themes FOR DELETE
USING (public.can_access_resource(user_id, team_id));

-- =====================================================
-- 6. Update CREDIT_HISTORY policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view their team's credit history" ON public.credit_history;

CREATE POLICY "Users can view own credit history"
ON public.credit_history FOR SELECT
USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'system'::app_role)
);

-- =====================================================
-- 7. Update CREDIT_PURCHASES policies
-- =====================================================

DROP POLICY IF EXISTS "Users can view their team's purchases" ON public.credit_purchases;

CREATE POLICY "Users can view own purchases"
ON public.credit_purchases FOR SELECT
USING (
  user_id = auth.uid()
  OR has_role(auth.uid(), 'system'::app_role)
);

-- =====================================================
-- 8. Update COUPONS_USED policies
-- =====================================================

DROP POLICY IF EXISTS "Team members can view their team's redeemed coupons" ON public.coupons_used;

CREATE POLICY "Users can view own redeemed coupons"
ON public.coupons_used FOR SELECT
USING (
  redeemed_by = auth.uid()
  OR has_role(auth.uid(), 'system'::app_role)
);

-- =====================================================
-- 9. Update ACTIONS policies (if they exist)
-- =====================================================

DROP POLICY IF EXISTS "Users can view their team's actions" ON public.actions;
DROP POLICY IF EXISTS "Users can create actions for their team" ON public.actions;
DROP POLICY IF EXISTS "Users can update their team's actions" ON public.actions;
DROP POLICY IF EXISTS "Users can delete their team's actions" ON public.actions;

CREATE POLICY "Users can view own or team actions"
ON public.actions FOR SELECT
USING (public.can_access_resource(user_id, team_id));

CREATE POLICY "Users can create actions"
ON public.actions FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own or team actions"
ON public.actions FOR UPDATE
USING (public.can_access_resource(user_id, team_id));

CREATE POLICY "Users can delete own or team actions"
ON public.actions FOR DELETE
USING (public.can_access_resource(user_id, team_id));