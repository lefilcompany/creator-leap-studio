/**
 * Utilitário para gerenciar créditos do usuário individual (profiles.credits)
 * Substitui a lógica antiga baseada em teams.credits
 */

export interface UserCreditsResult {
  userId: string;
  credits: number;
  teamId?: string;
  planId: string;
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
    .select('id, credits, team_id, plan_id')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    console.error('Error fetching user credits:', error);
    return null;
  }

  return {
    userId: profile.id,
    credits: profile.credits || 0,
    teamId: profile.team_id,
    planId: profile.plan_id || 'free',
  };
}

/**
 * Verifica se o usuário tem créditos suficientes
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
 * Deduz créditos do usuário individual
 */
export async function deductUserCredits(
  supabase: any,
  userId: string,
  amount: number
): Promise<{ success: boolean; newCredits: number; error?: string }> {
  // Buscar créditos atuais
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', userId)
    .single();

  if (fetchError || !profile) {
    return { success: false, newCredits: 0, error: 'Usuário não encontrado' };
  }

  const currentCredits = profile.credits || 0;
  const newCredits = currentCredits - amount;

  if (newCredits < 0) {
    return { success: false, newCredits: currentCredits, error: 'Créditos insuficientes' };
  }

  // Atualizar créditos
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ credits: newCredits })
    .eq('id', userId);

  if (updateError) {
    console.error('Error deducting credits:', updateError);
    return { success: false, newCredits: currentCredits, error: 'Erro ao deduzir créditos' };
  }

  return { success: true, newCredits };
}

/**
 * Adiciona créditos ao usuário individual (ex: reembolso)
 */
export async function addUserCredits(
  supabase: any,
  userId: string,
  amount: number
): Promise<{ success: boolean; newCredits: number; error?: string }> {
  // Buscar créditos atuais
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('credits')
    .eq('id', userId)
    .single();

  if (fetchError || !profile) {
    return { success: false, newCredits: 0, error: 'Usuário não encontrado' };
  }

  const currentCredits = profile.credits || 0;
  const newCredits = currentCredits + amount;

  // Atualizar créditos
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ credits: newCredits })
    .eq('id', userId);

  if (updateError) {
    console.error('Error adding credits:', updateError);
    return { success: false, newCredits: currentCredits, error: 'Erro ao adicionar créditos' };
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
