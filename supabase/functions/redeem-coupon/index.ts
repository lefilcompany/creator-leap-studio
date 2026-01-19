import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { addUserCredits, recordUserCreditUsage, getUserCredits } from '../_shared/userCredits.ts';

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

    // Verificar se cupom já foi usado por ESTE USUÁRIO
    const { data: existingCoupon, error: checkError } = await supabaseAdmin
      .from('coupons_used')
      .select('*')
      .eq('coupon_code', lowerCode)
      .eq('redeemed_by', user.id)
      .maybeSingle();

    if (checkError) {
      console.error('[redeem-coupon] Error checking coupon:', checkError);
      throw new Error('Erro ao verificar cupom');
    }

    if (existingCoupon) {
      console.log(`[redeem-coupon] Coupon already used by this user: ${normalizedCode}`);
      return new Response(
        JSON.stringify({ valid: false, error: 'Você já utilizou este cupom.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Buscar dados do profile do usuário (team_id agora é opcional)
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('team_id, credits')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('[redeem-coupon] Error fetching profile:', profileError);
      throw new Error('Erro ao buscar perfil do usuário');
    }

    console.log(`[redeem-coupon] User profile found: ${user.id} (team: ${profile.team_id || 'none'})`);

    // ============= CUPOM PROMOCIONAL =============
    if (isPromoCoupon(lowerCode)) {
      const promoOwner = PROMO_COUPONS[lowerCode];
      console.log(`[redeem-coupon] Promo coupon detected: ${lowerCode} (${promoOwner})`);

      // Registrar cupom promocional (usa user.id como team_id se não tiver equipe)
      const { error: insertError } = await supabaseAdmin
        .from('coupons_used')
        .insert({
          team_id: profile.team_id || user.id,
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

      // Adicionar créditos ao USUÁRIO (não mais team)
      const creditsBefore = profile.credits || 0;
      const addResult = await addUserCredits(supabaseAdmin, user.id, PROMO_CREDITS);

      if (!addResult.success) {
        console.error('[redeem-coupon] Error updating user credits:', addResult.error);
        return new Response(
          JSON.stringify({ 
            valid: false, 
            error: 'Cupom registrado, mas erro ao aplicar créditos. Contate o suporte.' 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      // Registrar no histórico
      await recordUserCreditUsage(supabaseAdmin, {
        userId: user.id,
        teamId: profile.team_id || undefined,
        actionType: 'COUPON_REDEMPTION',
        creditsUsed: -PROMO_CREDITS, // Negativo porque é adição
        creditsBefore: creditsBefore,
        creditsAfter: addResult.newCredits,
        description: `Cupom promocional ${promoOwner}`,
        metadata: { coupon_code: lowerCode, coupon_type: 'promo' }
      });

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

    // 3. Obter informações do prêmio
    const prizeInfo = getPrizeInfo(prefix);
    console.log(`[redeem-coupon] Prize info:`, prizeInfo);

    // 4. Aplicar benefícios
    const creditsBefore = profile.credits || 0;
    let creditsToAdd = 0;
    let profileUpdate: any = {};

    if (prizeInfo.type === 'days_basic') {
      // B4: Upgrade para Basic por 14 dias
      const newEnd = new Date();
      newEnd.setDate(newEnd.getDate() + 14);
      
      // Buscar créditos do plano basic
      const { data: basicPlan } = await supabaseAdmin
        .from('plans')
        .select('credits')
        .eq('id', 'basic')
        .single();
      
      creditsToAdd = basicPlan?.credits || 80;
      
      profileUpdate = {
        plan_id: 'basic',
        subscription_period_end: newEnd.toISOString(),
        subscription_status: 'active',
        credits: creditsBefore + creditsToAdd
      };
      
      console.log(`[redeem-coupon] Upgrading to Basic until ${newEnd.toISOString()}`);
      
    } else if (prizeInfo.type === 'days_pro') {
      // P7: Upgrade para Pro por 7 dias
      const newEnd = new Date();
      newEnd.setDate(newEnd.getDate() + 7);
      
      // Buscar créditos do plano pro
      const { data: proPlan } = await supabaseAdmin
        .from('plans')
        .select('credits')
        .eq('id', 'pro')
        .single();
      
      creditsToAdd = proPlan?.credits || 160;
      
      profileUpdate = {
        plan_id: 'pro',
        subscription_period_end: newEnd.toISOString(),
        subscription_status: 'active',
        credits: creditsBefore + creditsToAdd
      };
      
      console.log(`[redeem-coupon] Upgrading to Pro until ${newEnd.toISOString()}`);
      
    } else if (prizeInfo.type === 'credits') {
      // Cupons de créditos: adicionar diretamente ao usuário
      creditsToAdd = prizeInfo.value;
      profileUpdate = {
        credits: creditsBefore + creditsToAdd
      };

      console.log(`[redeem-coupon] Adding ${creditsToAdd} credits to user`);
    }

    console.log(`[redeem-coupon] Applying prize: ${JSON.stringify(profileUpdate)}`);

    // 5. Registrar cupom PRIMEIRO (previne uso duplo)
    console.log(`[redeem-coupon] Registering coupon in database...`);
    const { error: insertError } = await supabaseAdmin
      .from('coupons_used')
      .insert({
        team_id: profile.team_id || user.id,
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

    // 6. Aplicar benefícios ao PROFILE do usuário (não mais team)
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(profileUpdate)
      .eq('id', user.id);

    if (updateError) {
      console.error('[redeem-coupon] Error updating profile:', updateError);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          error: 'Cupom registrado, mas erro ao aplicar benefícios. Contate o suporte com o código: ' + upperCode 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    // 7. Registrar no histórico de créditos
    await recordUserCreditUsage(supabaseAdmin, {
      userId: user.id,
      teamId: profile.team_id || undefined,
      actionType: 'COUPON_REDEMPTION',
      creditsUsed: -creditsToAdd, // Negativo porque é adição
      creditsBefore: creditsBefore,
      creditsAfter: creditsBefore + creditsToAdd,
      description: `Cupom ${prizeInfo.description}`,
      metadata: { 
        coupon_code: upperCode, 
        coupon_prefix: prefix,
        prize_type: prizeInfo.type 
      }
    });

    console.log(`[redeem-coupon] ✅ Coupon redeemed successfully: ${upperCode}`);

    return new Response(
      JSON.stringify({
        valid: true,
        prize: prizeInfo
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[redeem-coupon] Error:', error);
    return new Response(
      JSON.stringify({ 
        valid: false, 
        error: error instanceof Error ? error.message : 'Erro interno' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
