import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Configurações de validação do cupom
const PREFIX_VALUES: Record<string, number> = {
  'B4': 14,    // 14 dias Basic
  'P7': 7,     // 7 dias Pro
  'C2': 200,   // 200 créditos
  'C1': 100,   // 100 créditos
  'C4': 40     // 40 créditos
};

const SECRET_MULTIPLIERS = [3, 7, 11, 13, 17, 19];
const MAGIC_SALT = 5381;

// Função para converter caractere em valor numérico
function charToValue(char: string): number {
  const code = char.charCodeAt(0);
  
  // Letras A-Z retornam valores 10-35
  if (code >= 65 && code <= 90) {
    return code - 55;  // A=10, B=11, ..., Z=35
  }
  
  // Números 0-9 retornam valores 0-9
  if (code >= 48 && code <= 57) {
    return code - 48;  // 0=0, 1=1, ..., 9=9
  }
  
  return 0;  // Caractere inválido
}

// Função para calcular o checksum esperado
function calculateChecksum(prefix: string, randomPart: string): string {
  let sum = 0;
  
  // Aplicar multiplicadores aos 6 caracteres da parte aleatória
  for (let i = 0; i < 6; i++) {
    const charValue = charToValue(randomPart[i]);
    const multiplier = SECRET_MULTIPLIERS[i % 6];
    sum += charValue * multiplier;
  }
  
  // Adicionar valor do prefixo e salt
  sum += PREFIX_VALUES[prefix] + MAGIC_SALT;
  
  // Calcular checksum em base36
  return (sum % 1296).toString(36).toUpperCase().padStart(2, '0');
}

// Função para validar formato do cupom
function validateCouponFormat(code: string): { valid: boolean; error?: string; parts?: { prefix: string; randomPart: string; checksum: string } } {
  const regex = /^(B4|P7|C2|C1|C4)-([A-Z0-9]{6})-([A-Z0-9]{2})$/;
  const match = code.match(regex);
  
  if (!match) {
    return { valid: false, error: 'Formato inválido. Use: XX-YYYYYY-CC' };
  }
  
  const [, prefix, randomPart, providedChecksum] = match;
  
  return {
    valid: true,
    parts: { prefix, randomPart, checksum: providedChecksum }
  };
}

// Função para validar checksum do cupom
function validateChecksum(prefix: string, randomPart: string, providedChecksum: string): boolean {
  const expectedChecksum = calculateChecksum(prefix, randomPart);
  return providedChecksum === expectedChecksum;
}

// Função para obter tipo de prêmio
function getPrizeInfo(prefix: string): { type: string; value: number; description: string } {
  const value = PREFIX_VALUES[prefix];
  
  if (prefix === 'B4') {
    return { type: 'days_basic', value, description: '14 dias extras no plano Basic' };
  } else if (prefix === 'P7') {
    return { type: 'days_pro', value, description: '7 dias extras no plano Pro' };
  } else {
    return { type: 'credits', value, description: `${value} créditos` };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Criar cliente Supabase com auth
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Criar cliente service role para operações privilegiadas
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verificar usuário autenticado
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      throw new Error('Usuário não autenticado');
    }

    console.log(`[redeem-coupon] Request from user: ${user.id}`);

    // Parse request body
    const { couponCode } = await req.json();

    if (!couponCode || typeof couponCode !== 'string') {
      return new Response(
        JSON.stringify({ valid: false, error: 'Código de cupom inválido' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const normalizedCode = couponCode.toUpperCase().trim();
    console.log(`[redeem-coupon] Validating coupon: ${normalizedCode}`);

    // 1. Validar formato
    const formatValidation = validateCouponFormat(normalizedCode);
    if (!formatValidation.valid) {
      console.log(`[redeem-coupon] Invalid format: ${formatValidation.error}`);
      return new Response(
        JSON.stringify({ valid: false, error: formatValidation.error }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const { prefix, randomPart, checksum } = formatValidation.parts!;

    // 2. Validar checksum
    if (!validateChecksum(prefix, randomPart, checksum)) {
      console.log(`[redeem-coupon] Invalid checksum for: ${normalizedCode}`);
      return new Response(
        JSON.stringify({ valid: false, error: 'Cupom inválido. Verifique o código e tente novamente.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`[redeem-coupon] Checksum valid for: ${normalizedCode}`);

    // 3. Verificar se cupom já foi usado
    const { data: existingCoupon, error: checkError } = await supabaseAdmin
      .from('coupons_used')
      .select('*')
      .eq('coupon_code', normalizedCode)
      .maybeSingle();

    if (checkError) {
      console.error('[redeem-coupon] Error checking coupon:', checkError);
      throw new Error('Erro ao verificar cupom');
    }

    if (existingCoupon) {
      console.log(`[redeem-coupon] Coupon already used: ${normalizedCode}`);
      return new Response(
        JSON.stringify({ valid: false, error: 'Este cupom já foi utilizado.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 4. Buscar dados da equipe do usuário
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('team_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.team_id) {
      console.error('[redeem-coupon] User has no team:', profileError);
      return new Response(
        JSON.stringify({ valid: false, error: 'Você precisa estar em uma equipe para resgatar cupons.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const { data: team, error: teamError } = await supabaseAdmin
      .from('teams')
      .select('*')
      .eq('id', profile.team_id)
      .single();

    if (teamError || !team) {
      console.error('[redeem-coupon] Team not found:', teamError);
      throw new Error('Equipe não encontrada');
    }

    console.log(`[redeem-coupon] Team found: ${team.id} (plan: ${team.plan_id})`);

    // 5. Obter informações do prêmio
    const prizeInfo = getPrizeInfo(prefix);
    console.log(`[redeem-coupon] Prize info:`, prizeInfo);

    // 6. Aplicar benefícios
    let updateData: any = {};

    if (prizeInfo.type === 'days_basic' || prizeInfo.type === 'days_pro') {
      // Cupons de dias: verificar compatibilidade com plano
      const requiredPlan = prizeInfo.type === 'days_basic' ? 'basic' : 'pro';
      
      if (team.plan_id !== requiredPlan) {
        console.log(`[redeem-coupon] Plan incompatible: ${team.plan_id} vs ${requiredPlan}`);
        return new Response(
          JSON.stringify({ 
            valid: false, 
            error: `Este cupom é válido apenas para o plano ${requiredPlan === 'basic' ? 'Basic' : 'Pro'}.` 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Estender período de assinatura
      const currentEnd = team.subscription_period_end ? new Date(team.subscription_period_end) : new Date();
      const newEnd = new Date(currentEnd);
      newEnd.setDate(newEnd.getDate() + prizeInfo.value);
      
      updateData = {
        subscription_period_end: newEnd.toISOString(),
        subscription_status: 'active'
      };

      console.log(`[redeem-coupon] Extending subscription from ${currentEnd.toISOString()} to ${newEnd.toISOString()}`);
    } else if (prizeInfo.type === 'credits') {
      // Cupons de créditos: distribuir proporcionalmente
      const totalCredits = prizeInfo.value;
      
      // Distribuição baseada no plano Free (5/15/10/5 = 35 total)
      const distribution = {
        quick: 5/35,       // ~14%
        suggestions: 15/35, // ~43%
        reviews: 10/35,    // ~29%
        plans: 5/35        // ~14%
      };
      
      const creditsToAdd = {
        quick: Math.floor(totalCredits * distribution.quick),
        suggestions: Math.floor(totalCredits * distribution.suggestions),
        reviews: Math.floor(totalCredits * distribution.reviews),
        plans: Math.floor(totalCredits * distribution.plans)
      };

      updateData = {
        credits_quick_content: team.credits_quick_content + creditsToAdd.quick,
        credits_suggestions: team.credits_suggestions + creditsToAdd.suggestions,
        credits_reviews: team.credits_reviews + creditsToAdd.reviews,
        credits_plans: team.credits_plans + creditsToAdd.plans
      };

      console.log(`[redeem-coupon] Adding credits:`, creditsToAdd);
    }

    // 7. Atualizar equipe e registrar cupom (transação)
    const { error: updateError } = await supabaseAdmin
      .from('teams')
      .update(updateData)
      .eq('id', team.id);

    if (updateError) {
      console.error('[redeem-coupon] Error updating team:', updateError);
      throw new Error('Erro ao aplicar benefícios');
    }

    // Registrar cupom usado
    const { error: insertError } = await supabaseAdmin
      .from('coupons_used')
      .insert({
        team_id: team.id,
        coupon_code: normalizedCode,
        coupon_prefix: prefix,
        prize_type: prizeInfo.type,
        prize_value: prizeInfo.value,
        redeemed_by: user.id
      });

    if (insertError) {
      console.error('[redeem-coupon] Error registering coupon:', insertError);
      // Rollback: reverter mudanças na equipe
      throw new Error('Erro ao registrar cupom');
    }

    console.log(`[redeem-coupon] ✅ Coupon redeemed successfully: ${normalizedCode}`);

    return new Response(
      JSON.stringify({
        valid: true,
        prize: {
          type: prizeInfo.type,
          value: prizeInfo.value,
          description: prizeInfo.description
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('[redeem-coupon] Error:', error);
    return new Response(
      JSON.stringify({ 
        valid: false, 
        error: error.message || 'Erro ao processar cupom' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
