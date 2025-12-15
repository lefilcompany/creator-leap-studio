import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============= CUPONS PROMOCIONAIS ÚNICOS (200 créditos) =============
const PROMO_COUPONS: Record<string, string> = {
  'alinearaujo200': 'Aline Araújo',
  'anacelina200': 'Ana Celina',
  'anahildameneses200': 'Ana Hilda Randal Meneses',
  'anaquezado200': 'Ana Quezado',
  'camilaandrade200': 'Camila Andrade',
  'carlamatos200': 'Carla Matos',
  'carolvasconcelos200': 'Carol Vasconcelos',
  'cassiamonteiro200': 'Cassia Monteiro',
  'chateaubriandarrais200': 'Chateaubriand Arrais',
  'claudioaugusto200': 'Cláudio Augusto',
  'daviraulino200': 'Davi Raulino',
  'drfabricio200': 'Dr. Fabricio',
  'eliasbruno200': 'Elias Bruno',
  'elizianecolares200': 'Eliziane Colares',
  'emmanuelbrandao200': 'Emmanuel Brandão',
  'giacomobrayner200': 'Giacomo Brayner',
  'helainetahim200': 'Helaine Tahim',
  'hugolopes200': 'Hugo Lopes',
  'ilinamemede200': 'Ilina Mamede',
  'ionaramonteiro200': 'Ionara Monteiro',
  'joselmaoliveira200': 'Joselma Oliveira',
  'karlarodrigues200': 'Karla Rodrigues',
  'kellyannepinheiro200': 'Kellyanne Pinheiro',
  'larissaaguiar200': 'Larissa Aguiar',
  'leonardoleitao200': 'Leonardo Leitão',
  'liaquindere200': 'Lia Quinderé',
  'lucianacastro200': 'Luciana Castro',
  'ludgardooliveira200': 'Ludgardo Oliveira',
  'luisalemos200': 'Luisa Lemos',
  'marcosandre200': 'Marcos André',
  'mariatereza200': 'Maria Tereza',
  'maurocosta200': 'Mauro Costa',
  'nayaraagrela200': 'Nayara Agrela',
  'paulojrpieiro200': 'Paulo Jr. Pieiro',
  'raysaridia200': 'Raysa Ridia',
  'rebeccabrasil200': 'Rebecca Brasil',
  'renatasantos200': 'Renata Santos',
  'rodrigobourbon200': 'Rodrigo Bourbon',
  'ronaldotelles200': 'Ronaldo Telles',
  'tatianabrigido200': 'Tatiana Brigido',
  'thiagocaldas200': 'Thiago Caldas',
  'thiagofacanha200': 'Thiago Façanha',
  'thiagotaumaturgo200': 'Thiago Taumaturgo',
  'vinifernandes200': 'Vini Fernandes',
  'sinaravasconcelos200': 'Sinara Vasconcelos',
  'samuelmuniz200': 'Samuel Muniz',
};

const PROMO_CREDITS = 200;

// Função para verificar se é um cupom promocional
function isPromoCoupon(code: string): boolean {
  return code.toLowerCase() in PROMO_COUPONS;
}

// ============= SISTEMA DE CUPONS COM CHECKSUM =============
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
    return { type: 'days_basic', value, description: 'Upgrade para Basic por 14 dias' };
  } else if (prefix === 'P7') {
    return { type: 'days_pro', value, description: 'Upgrade para Pro por 7 dias' };
  } else {
    return { type: 'credits', value, description: `${value} créditos` };
  }
}

// Função para buscar créditos de um plano
async function getPlanCredits(planId: string, supabaseAdmin: any) {
  const { data: plan, error } = await supabaseAdmin
    .from('plans')
    .select('credits_quick_content, credits_suggestions, credits_reviews, credits_plans')
    .eq('id', planId)
    .single();
  
  if (error || !plan) {
    throw new Error(`Plano ${planId} não encontrado`);
  }
  
  return plan;
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

    const normalizedCode = couponCode.trim();
    const lowerCode = normalizedCode.toLowerCase();
    console.log(`[redeem-coupon] Validating coupon: ${normalizedCode}`);

    // Verificar se cupom já foi usado (tanto promo quanto checksum)
    const { data: existingCoupon, error: checkError } = await supabaseAdmin
      .from('coupons_used')
      .select('*')
      .eq('coupon_code', lowerCode)
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

    // Buscar dados da equipe do usuário
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

    // ============= CUPOM PROMOCIONAL =============
    if (isPromoCoupon(lowerCode)) {
      const promoOwner = PROMO_COUPONS[lowerCode];
      console.log(`[redeem-coupon] Promo coupon detected: ${lowerCode} (${promoOwner})`);

      // Registrar cupom promocional
      const { error: insertError } = await supabaseAdmin
        .from('coupons_used')
        .insert({
          team_id: team.id,
          coupon_code: lowerCode,
          coupon_prefix: 'PROMO',
          prize_type: 'credits',
          prize_value: PROMO_CREDITS,
          redeemed_by: user.id
        });

      if (insertError) {
        console.error('[redeem-coupon] Error registering promo coupon:', insertError);
        if (insertError.code === '23505') {
          return new Response(
            JSON.stringify({ valid: false, error: 'Este cupom já foi utilizado.' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }
        throw new Error('Erro ao registrar cupom. Tente novamente.');
      }

      // Adicionar 200 créditos à equipe
      const { error: updateError } = await supabaseAdmin
        .from('teams')
        .update({ credits: (team.credits || 0) + PROMO_CREDITS })
        .eq('id', team.id);

      if (updateError) {
        console.error('[redeem-coupon] Error updating team credits:', updateError);
        return new Response(
          JSON.stringify({ 
            valid: false, 
            error: 'Cupom registrado, mas erro ao aplicar créditos. Contate o suporte.' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      console.log(`[redeem-coupon] ✅ Promo coupon redeemed: ${lowerCode} (+${PROMO_CREDITS} credits)`);

      return new Response(
        JSON.stringify({
          valid: true,
          prize: {
            type: 'credits',
            value: PROMO_CREDITS,
            description: `${PROMO_CREDITS} créditos (Cupom ${promoOwner})`
          }
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============= CUPOM COM CHECKSUM =============
    const upperCode = normalizedCode.toUpperCase();
    
    // 1. Validar formato
    const formatValidation = validateCouponFormat(upperCode);
    if (!formatValidation.valid) {
      console.log(`[redeem-coupon] Invalid format: ${formatValidation.error}`);
      return new Response(
        JSON.stringify({ valid: false, error: 'Cupom inválido. Verifique o código e tente novamente.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const { prefix, randomPart, checksum } = formatValidation.parts!;

    // 2. Validar checksum
    if (!validateChecksum(prefix, randomPart, checksum)) {
      console.log(`[redeem-coupon] Invalid checksum for: ${upperCode}`);
      return new Response(
        JSON.stringify({ valid: false, error: 'Cupom inválido. Verifique o código e tente novamente.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    console.log(`[redeem-coupon] Checksum valid for: ${upperCode}`);

    // 5. Obter informações do prêmio
    const prizeInfo = getPrizeInfo(prefix);
    console.log(`[redeem-coupon] Prize info:`, prizeInfo);

    // 6. Aplicar benefícios
    let updateData: any = {};

    if (prizeInfo.type === 'days_basic') {
      // B4: Upgrade para Basic (apenas se for Free)
      if (team.plan_id !== 'free') {
        console.log(`[redeem-coupon] Plan incompatible: ${team.plan_id} must be 'free' for B4`);
        return new Response(
          JSON.stringify({ 
            valid: false, 
            error: 'Este cupom só pode ser usado por equipes no plano Free.' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
      
      // Buscar créditos do plano Basic
      const basicPlanCredits = await getPlanCredits('basic', supabaseAdmin);
      
      // Fazer upgrade para Basic + 14 dias + créditos do plano
      const newEnd = new Date();
      newEnd.setDate(newEnd.getDate() + 14);
      
      updateData = {
        plan_id: 'basic',
        subscription_period_end: newEnd.toISOString(),
        subscription_status: 'active',
        credits_quick_content: basicPlanCredits.credits_quick_content,
        credits_suggestions: basicPlanCredits.credits_suggestions,
        credits_reviews: basicPlanCredits.credits_reviews,
        credits_plans: basicPlanCredits.credits_plans
      };
      
      console.log(`[redeem-coupon] Upgrading to Basic until ${newEnd.toISOString()} with credits:`, basicPlanCredits);
      
    } else if (prizeInfo.type === 'days_pro') {
      // P7: Upgrade para Pro (apenas se for Free ou Basic)
      if (team.plan_id !== 'free' && team.plan_id !== 'basic') {
        console.log(`[redeem-coupon] Plan incompatible: ${team.plan_id} must be 'free' or 'basic' for P7`);
        return new Response(
          JSON.stringify({ 
            valid: false, 
            error: 'Este cupom só pode ser usado por equipes nos planos Free ou Basic.' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
      
      // Buscar créditos do plano Pro
      const proPlanCredits = await getPlanCredits('pro', supabaseAdmin);
      
      // Fazer upgrade para Pro + 7 dias + créditos do plano
      const newEnd = new Date();
      newEnd.setDate(newEnd.getDate() + 7);
      
      updateData = {
        plan_id: 'pro',
        subscription_period_end: newEnd.toISOString(),
        subscription_status: 'active',
        credits_quick_content: proPlanCredits.credits_quick_content,
        credits_suggestions: proPlanCredits.credits_suggestions,
        credits_reviews: proPlanCredits.credits_reviews,
        credits_plans: proPlanCredits.credits_plans
      };
      
      console.log(`[redeem-coupon] Upgrading to Pro until ${newEnd.toISOString()} with credits:`, proPlanCredits);
    } else if (prizeInfo.type === 'credits') {
      // Cupons de créditos: distribuir igualitariamente
      const totalCredits = prizeInfo.value;
      
      // Distribuição IGUALITÁRIA (25% para cada tipo)
      const creditsPerType = Math.floor(totalCredits / 4);
      
      const creditsToAdd = {
        quick: creditsPerType,
        suggestions: creditsPerType,
        reviews: creditsPerType,
        plans: creditsPerType
      };

      updateData = {
        credits_quick_content: team.credits_quick_content + creditsToAdd.quick,
        credits_suggestions: team.credits_suggestions + creditsToAdd.suggestions,
        credits_reviews: team.credits_reviews + creditsToAdd.reviews,
        credits_plans: team.credits_plans + creditsToAdd.plans
      };

      console.log(`[redeem-coupon] Adding credits:`, creditsToAdd);
    }

    console.log(`[redeem-coupon] Applying prize: ${JSON.stringify(updateData)}`);

    // 7. Registrar cupom PRIMEIRO (previne uso duplo)
    console.log(`[redeem-coupon] Registering coupon in database...`);
    const { error: insertError } = await supabaseAdmin
      .from('coupons_used')
      .insert({
        team_id: team.id,
        coupon_code: upperCode,
        coupon_prefix: prefix,
        prize_type: prizeInfo.type,
        prize_value: prizeInfo.value,
        redeemed_by: user.id
      });

    if (insertError) {
      console.error('[redeem-coupon] Error registering coupon:', insertError);
      
      // Se for erro de duplicidade (unique constraint)
      if (insertError.code === '23505') {
        return new Response(
          JSON.stringify({ valid: false, error: 'Este cupom já foi utilizado.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }
      
      throw new Error('Erro ao registrar cupom. Tente novamente.');
    }

    console.log(`[redeem-coupon] Coupon registered. Applying benefits...`);

    // 8. Aplicar benefícios DEPOIS (se falhar, cupom já está protegido)
    const { error: updateError } = await supabaseAdmin
      .from('teams')
      .update(updateData)
      .eq('id', team.id);

    if (updateError) {
      console.error('[redeem-coupon] Error updating team:', updateError);
      // Cupom já está marcado como usado, mas benefícios não foram aplicados
      // Isso requer atenção do suporte, mas previne fraude
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Cupom registrado, mas erro ao aplicar benefícios. Contate o suporte com o código: ' + upperCode 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    console.log(`[redeem-coupon] ✅ Coupon redeemed successfully: ${upperCode}`);

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
