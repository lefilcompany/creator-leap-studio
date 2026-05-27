/**
 * Utilitário para gerenciar créditos do usuário individual (profiles.credits)
 * Créditos expiram 30 dias após a compra (credits_expire_at)
 */

export interface UserCreditsResult {
  userId: string;
  credits: number;
  teamId?: string;
  planId: string;
  creditsExpireAt?: string;
}

/**
 * Verifica se os créditos do usuário estão expirados
 */
function areCreditsExpired(expireAt?: string | null): boolean {
  if (!expireAt) return false; // Sem data de expiração = não expira (legado)
  return new Date(expireAt) < new Date();
}

/**
 * Retorna os créditos efetivos (0 se expirados)
 */
function getEffectiveCredits(credits: number, expireAt?: string | null): number {
  if (areCreditsExpired(expireAt)) return 0;
  return credits;
}

/**
 * Busca os créditos do usuário individual
 */
export async function getUserCredits(
  supabase: any,
  userId: string
): Promise<UserCreditsResult | null> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, credits, team_id, plan_id, credits_expire_at')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    console.error('Error fetching user credits:', error);
    return null;
  }

  const effectiveCredits = getEffectiveCredits(profile.credits || 0, profile.credits_expire_at);

  return {
    userId: profile.id,
    credits: effectiveCredits,
    teamId: profile.team_id,
    planId: profile.plan_id || 'free',
    creditsExpireAt: profile.credits_expire_at,
  };
}

/**
 * Verifica se o usuário tem créditos suficientes (considerando expiração)
 */
export async function checkUserCredits(
  supabase: any,
  userId: string,
  requiredCredits: number
): Promise<{ hasCredits: boolean; currentCredits: number; teamId?: string }> {
  const result = await getUserCredits(supabase, userId);
  
  if (!result) {
    return { hasCredits: false, currentCredits: 0 };
  }

  return {
    hasCredits: result.credits >= requiredCredits,
    currentCredits: result.credits,
    teamId: result.teamId,
  };
}

/**
 * Deduz créditos do usuário individual (verifica expiração antes)
 */
export async function deductUserCredits(
  supabase: any,
  userId: string,
  amount: number
): Promise<{ success: boolean; newCredits: number; error?: string }> {
  // Buscar créditos atuais com expiração
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('credits, credits_expire_at')
    .eq('id', userId)
    .single();

  if (fetchError || !profile) {
    return { success: false, newCredits: 0, error: 'Usuário não encontrado' };
  }

  const effectiveCredits = getEffectiveCredits(profile.credits || 0, profile.credits_expire_at);
  const newCredits = effectiveCredits - amount;

  if (newCredits < 0) {
    if (areCreditsExpired(profile.credits_expire_at)) {
      return { success: false, newCredits: 0, error: 'Seus créditos expiraram. Adquira um novo pacote para continuar.' };
    }
    return { success: false, newCredits: effectiveCredits, error: 'Créditos insuficientes' };
  }

  // Atualizar créditos
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ credits: newCredits })
    .eq('id', userId);

  if (updateError) {
    console.error('Error deducting credits:', updateError);
    return { success: false, newCredits: effectiveCredits, error: 'Erro ao deduzir créditos' };
  }

  return { success: true, newCredits };
}

/**
 * Adiciona créditos ao usuário individual (ex: compra ou reembolso)
 * Ao adicionar créditos, define nova data de expiração (30 dias)
 */
export async function addUserCredits(
  supabase: any,
  userId: string,
  amount: number,
  setExpiration: boolean = true
): Promise<{ success: boolean; newCredits: number; error?: string }> {
  // Buscar créditos atuais
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('credits, max_credits, credits_expire_at')
    .eq('id', userId)
    .single();

  if (fetchError || !profile) {
    return { success: false, newCredits: 0, error: 'Usuário não encontrado' };
  }

  // Créditos novos substituem os antigos (não acumulam)
  const newCredits = amount;
  const currentMaxCredits = profile.max_credits || 0;
  const newMaxCredits = Math.max(currentMaxCredits, newCredits);

  // Calcular nova data de expiração: 30 dias a partir de agora
  const updateData: any = { credits: newCredits, max_credits: newMaxCredits };
  
  if (setExpiration) {
    const expireAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    updateData.credits_expire_at = expireAt;
  }

  // Atualizar créditos e max_credits
  const { error: updateError } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', userId);

  if (updateError) {
    console.error('Error adding credits:', updateError);
    return { success: false, newCredits: profile.credits || 0, error: 'Erro ao adicionar créditos' };
  }

  return { success: true, newCredits };
}

/**
 * Registra uso de crédito no histórico (agora usando user_id como referência principal)
 */
export async function recordUserCreditUsage(
  supabase: any,
  params: {
    userId: string;
    teamId?: string;
    actionType: string;
    creditsUsed: number;
    creditsBefore: number;
    creditsAfter: number;
    description?: string;
    metadata?: any;
  }
) {
  const { error } = await supabase
    .from('credit_history')
    .insert({
      user_id: params.userId,
      team_id: params.teamId || null,
      action_type: params.actionType,
      credits_used: params.creditsUsed,
      credits_before: params.creditsBefore,
      credits_after: params.creditsAfter,
      description: params.description,
      metadata: params.metadata || {},
    });

  if (error) {
    console.error('Failed to record credit usage:', error);
  }
}
