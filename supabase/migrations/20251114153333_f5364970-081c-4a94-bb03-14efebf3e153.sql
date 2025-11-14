-- Adicionar plano Enterprise
INSERT INTO plans (
  id, name, description, price_monthly, 
  credits, max_members, max_brands, 
  max_personas, max_strategic_themes, 
  trial_days, is_active, can_subscribe_online,
  stripe_product_id, stripe_price_id_monthly
) VALUES (
  'pack_enterprise', 
  'Enterprise', 
  'Pacote empresarial com 640 créditos. Até 100 membros. 3 marcas/personas/temas gratuitos.', 
  1199.90,
  640, 
  100, 
  3, 
  3, 
  3, 
  0, 
  true, 
  true,
  'prod_TQFTH5994CZA2y',
  'price_1STOynAGsH8eqXqH4GAkPe5H'
) ON CONFLICT (id) DO NOTHING;

-- Criar tabela de histórico de compras de créditos
CREATE TABLE IF NOT EXISTS credit_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  purchase_type TEXT NOT NULL CHECK (purchase_type IN ('plan', 'custom')),
  plan_id TEXT,
  credits_purchased INTEGER NOT NULL CHECK (credits_purchased > 0),
  amount_paid NUMERIC(10,2) NOT NULL CHECK (amount_paid >= 0),
  stripe_payment_intent_id TEXT,
  stripe_checkout_session_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_credit_purchases_team_id ON credit_purchases(team_id);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_user_id ON credit_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_session_id ON credit_purchases(stripe_checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_status ON credit_purchases(status);

-- RLS Policies para credit_purchases
ALTER TABLE credit_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their team's purchases" ON credit_purchases;
CREATE POLICY "Users can view their team's purchases"
  ON credit_purchases FOR SELECT
  USING (team_id IN (SELECT team_id FROM profiles WHERE id = auth.uid()));

DROP POLICY IF EXISTS "System can insert purchases" ON credit_purchases;
CREATE POLICY "System can insert purchases"
  ON credit_purchases FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "System can update purchases" ON credit_purchases;
CREATE POLICY "System can update purchases"
  ON credit_purchases FOR UPDATE
  USING (true);