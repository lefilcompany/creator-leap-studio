import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { addUserCredits, recordUserCreditUsage, getUserCredits } from '../_shared/userCredits.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function getProfileSyncPayload(profile: {
  credits?: number | null;
  max_credits?: number | null;
  credits_expire_at?: string | null;
  plan_id?: string | null;
  subscription_status?: string | null;
  subscription_period_end?: string | null;
}) {
  return {
    currentCredits: profile.credits ?? 0,
    maxCredits: profile.max_credits ?? profile.credits ?? 0,
    creditsExpireAt: profile.credits_expire_at ?? null,
    planId: profile.plan_id ?? 'free',
    subscriptionStatus: profile.subscription_status ?? null,
    subscriptionPeriodEnd: profile.subscription_period_end ?? null,
  };
}

// Promo coupons are now managed in the 'coupons' table in the database.

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

    // Verificar se cupom já foi usado por ESTE USUÁRIO (check both cases)
    const upperCode = normalizedCode.toUpperCase();
    const { data: existingCoupons, error: checkError } = await supabaseAdmin
      .from('coupons_used')
      .select('id')
      .eq('redeemed_by', user.id)
      .in('coupon_code', [lowerCode, upperCode, normalizedCode]);
    
    const existingCoupon = existingCoupons && existingCoupons.length > 0 ? existingCoupons[0] : null;

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

    // Garantir que o profile exista de forma atômica no backend
    let { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('team_id, credits, max_credits')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('[redeem-coupon] Error fetching profile:', profileError);
      throw new Error('Erro ao buscar perfil do usuário');
    }

    if (!profile) {
      console.log(`[redeem-coupon] Profile missing for ${user.id}, creating fallback profile...`);

      const { error: createProfileError } = await supabaseAdmin
        .from('profiles')
        .upsert(
          {
            id: user.id,
            email: user.email ?? `${user.id}@creator.local`,
            name: user.user_metadata?.name || user.user_metadata?.full_name || user.email || 'Usuário',
            credits: 0,
            max_credits: 0,
            plan_id: 'free',
            avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
          },
          { onConflict: 'id' }
        );

      if (createProfileError) {
        console.error('[redeem-coupon] Error creating fallback profile:', createProfileError);
        throw new Error('Erro ao preparar perfil do usuário para resgatar o cupom');
      }

      const { data: createdProfile, error: createdProfileError } = await supabaseAdmin
        .from('profiles')
        .select('team_id, credits, max_credits')
        .eq('id', user.id)
        .single();

      if (createdProfileError || !createdProfile) {
        console.error('[redeem-coupon] Error reloading fallback profile:', createdProfileError);
        throw new Error('Erro ao confirmar perfil do usuário após cadastro');
      }

      profile = createdProfile;
    }

    console.log(`[redeem-coupon] User profile found: ${user.id} (team: ${profile.team_id || 'none'})`);

    // ============= CUPOM DO BANCO DE DADOS (criado por admin ou promocional) =============
    // First check if coupon exists at all (without is_active filter)
    const { data: dbCouponAny, error: dbCouponAnyError } = await supabaseAdmin
      .from('coupons')
      .select('*')
      .eq('code', normalizedCode.toUpperCase())
      .maybeSingle();

    if (dbCouponAnyError) {
      console.error('[redeem-coupon] Error checking DB coupon:', dbCouponAnyError);
    }

    if (dbCouponAny) {
      console.log(`[redeem-coupon] DB coupon found: ${dbCouponAny.code} (active: ${dbCouponAny.is_active})`);

      // Check if coupon is inactive/disabled
      if (!dbCouponAny.is_active) {
        return new Response(
          JSON.stringify({ valid: false, error: 'Cupom indisponível.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      const dbCoupon = dbCouponAny;

      // Check expiration
      if (dbCoupon.expires_at && new Date(dbCoupon.expires_at) < new Date()) {
        return new Response(
          JSON.stringify({ valid: false, error: 'Este cupom expirou.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      // Check max uses
      if (dbCoupon.max_uses !== null && dbCoupon.uses_count >= dbCoupon.max_uses) {
        return new Response(
          JSON.stringify({ valid: false, error: 'Este cupom atingiu o limite de usos.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      const creditsToAdd = dbCoupon.prize_value;
      const creditsBefore = profile.credits || 0;

      // Register in coupons_used
      const { error: insertError } = await supabaseAdmin
        .from('coupons_used')
        .insert({
          team_id: profile.team_id || null,
          coupon_code: dbCoupon.code,
          coupon_prefix: dbCoupon.prefix,
          prize_type: dbCoupon.prize_type,
          prize_value: creditsToAdd,
          redeemed_by: user.id
        });

      if (insertError) {
        if (insertError.code === '23505') {
          return new Response(
            JSON.stringify({ valid: false, error: 'Você já utilizou este cupom.' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
          );
        }
        throw new Error('Erro ao registrar cupom.');
      }

      // Add credits directly to profile (addUserCredits replaces, we need to SUM)
      const newCredits = creditsBefore + creditsToAdd;
      const newMaxCredits = Math.max(profile.max_credits ?? 0, newCredits);
      const expireAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      const { data: updatedProfile, error: creditError } = await supabaseAdmin
        .from('profiles')
        .update({ credits: newCredits, max_credits: newMaxCredits, credits_expire_at: expireAt })
        .eq('id', user.id)
        .select('credits, max_credits, credits_expire_at, plan_id, subscription_status, subscription_period_end')
        .single();
      
      if (creditError) {
        return new Response(
          JSON.stringify({ valid: false, error: 'Erro ao aplicar créditos. Contate o suporte.' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }
      const addResult = { success: true, newCredits };

      // Increment uses_count
      await supabaseAdmin
        .from('coupons')
        .update({ uses_count: dbCoupon.uses_count + 1 })
        .eq('id', dbCoupon.id);

      // Record credit history
      await recordUserCreditUsage(supabaseAdmin, {
        userId: user.id,
        teamId: profile.team_id || undefined,
        actionType: 'COUPON_REDEMPTION',
        creditsUsed: -creditsToAdd,
        creditsBefore: creditsBefore,
        creditsAfter: addResult.newCredits,
        description: `Cupom ${dbCoupon.code} (${creditsToAdd} créditos)`,
        metadata: { coupon_code: dbCoupon.code, coupon_type: 'admin_created' }
      });

      console.log(`[redeem-coupon] ✅ DB coupon redeemed: ${dbCoupon.code} (+${creditsToAdd} credits)`);

      return new Response(
        JSON.stringify({
          valid: true,
          prize: {
            type: 'credits',
            value: creditsToAdd,
            description: `${creditsToAdd} créditos`
          },
          profile: updatedProfile ? getProfileSyncPayload(updatedProfile) : undefined,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ============= CUPOM COM CHECKSUM =============
    // upperCode already declared above
    
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
        credits: creditsBefore + creditsToAdd,
        max_credits: Math.max(profile.max_credits ?? 0, creditsBefore + creditsToAdd),
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
        credits: creditsBefore + creditsToAdd,
        max_credits: Math.max(profile.max_credits ?? 0, creditsBefore + creditsToAdd),
      };
      
      console.log(`[redeem-coupon] Upgrading to Pro until ${newEnd.toISOString()}`);
      
    } else if (prizeInfo.type === 'credits') {
      // Cupons de créditos: adicionar diretamente ao usuário
      creditsToAdd = prizeInfo.value;
      profileUpdate = {
        credits: creditsBefore + creditsToAdd,
        max_credits: Math.max(profile.max_credits ?? 0, creditsBefore + creditsToAdd),
        credits_expire_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };

      console.log(`[redeem-coupon] Adding ${creditsToAdd} credits to user`);
    }

    console.log(`[redeem-coupon] Applying prize: ${JSON.stringify(profileUpdate)}`);

    // 5. Registrar cupom PRIMEIRO (previne uso duplo)
    console.log(`[redeem-coupon] Registering coupon in database...`);
    const { error: insertError } = await supabaseAdmin
      .from('coupons_used')
      .insert({
        team_id: profile.team_id || null,
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
    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(profileUpdate)
      .eq('id', user.id)
      .select('credits, max_credits, credits_expire_at, plan_id, subscription_status, subscription_period_end')
      .single();

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
        prize: prizeInfo,
        profile: updatedProfile ? getProfileSyncPayload(updatedProfile) : undefined,
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
