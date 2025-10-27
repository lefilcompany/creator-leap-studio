-- Criar tabela para registrar cupons utilizados
CREATE TABLE IF NOT EXISTS public.coupons_used (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  coupon_code TEXT NOT NULL UNIQUE,
  coupon_prefix TEXT NOT NULL,
  prize_type TEXT NOT NULL,
  prize_value INTEGER NOT NULL,
  redeemed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  redeemed_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_coupons_used_team_id ON public.coupons_used(team_id);
CREATE INDEX idx_coupons_used_coupon_code ON public.coupons_used(coupon_code);
CREATE INDEX idx_coupons_used_redeemed_at ON public.coupons_used(redeemed_at);

-- Comentários
COMMENT ON TABLE public.coupons_used IS 'Registro de cupons de premiação resgatados pelas equipes';
COMMENT ON COLUMN public.coupons_used.coupon_prefix IS 'Prefixo do cupom (B4, P7, C1, C2, C4)';
COMMENT ON COLUMN public.coupons_used.prize_type IS 'Tipo de prêmio (days_basic, days_pro, credits)';
COMMENT ON COLUMN public.coupons_used.prize_value IS 'Valor do prêmio (14, 7, 200, 100, 40)';

-- Habilitar RLS
ALTER TABLE public.coupons_used ENABLE ROW LEVEL SECURITY;

-- Policies: Membros da equipe podem ver cupons resgatados pela equipe
CREATE POLICY "Team members can view their team's redeemed coupons"
ON public.coupons_used
FOR SELECT
USING (
  team_id IN (
    SELECT team_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Inserção é feita apenas pelo Edge Function (service role key)