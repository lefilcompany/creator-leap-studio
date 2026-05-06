/**
 * Utilitário para gerenciar créditos.
 * - Pessoal: profiles.credits (com expiração 30 dias).
 * - Workspace compartilhado: workspaces.shared_credits (sem expiração própria).
 *
 * Quando workspaceId é fornecido, o helper resolve o credit_mode do workspace
 * e debita/credita do pool correto, respeitando o monthly_credit_limit do member
 * (workspace_members.monthly_credit_limit).
 */

export interface UserCreditsResult {
  userId: string;
  credits: number;
  teamId?: string;
  planId: string;
  creditsExpireAt?: string;
  workspaceId?: string;
  creditMode?: 'personal' | 'shared';
}

function areCreditsExpired(expireAt?: string | null): boolean {
  if (!expireAt) return false;
  return new Date(expireAt) < new Date();
}

function getEffectiveCredits(credits: number, expireAt?: string | null): number {
  if (areCreditsExpired(expireAt)) return 0;
  return credits;
}

async function resolveWorkspace(supabase: any, workspaceId?: string | null) {
  if (!workspaceId) return null;
  const { data } = await supabase
    .from('workspaces')
    .select('id, credit_mode, shared_credits, owner_id')
    .eq('id', workspaceId)
    .maybeSingle();
  return data || null;
}

async function resolveActiveWorkspaceId(
  supabase: any,
  userId: string,
  workspaceId?: string | null,
): Promise<string | null> {
  if (workspaceId) return workspaceId;
  const { data } = await supabase
    .from('profiles')
    .select('current_workspace_id')
    .eq('id', userId)
    .maybeSingle();
  return data?.current_workspace_id ?? null;
}

export async function getUserCredits(
  supabase: any,
  userId: string,
  workspaceId?: string | null,
): Promise<UserCreditsResult | null> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, credits, team_id, plan_id, credits_expire_at, current_workspace_id')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    console.error('Error fetching user credits:', error);
    return null;
  }

  const wsId = workspaceId ?? profile.current_workspace_id ?? null;
  const ws = await resolveWorkspace(supabase, wsId);

  if (ws && ws.credit_mode === 'shared') {
    return {
      userId: profile.id,
      credits: ws.shared_credits ?? 0,
      teamId: profile.team_id,
      planId: profile.plan_id || 'free',
      workspaceId: ws.id,
      creditMode: 'shared',
    };
  }

  const effective = getEffectiveCredits(profile.credits || 0, profile.credits_expire_at);
  return {
    userId: profile.id,
    credits: effective,
    teamId: profile.team_id,
    planId: profile.plan_id || 'free',
    creditsExpireAt: profile.credits_expire_at,
    workspaceId: ws?.id,
    creditMode: 'personal',
  };
}

export async function checkUserCredits(
  supabase: any,
  userId: string,
  requiredCredits: number,
  workspaceId?: string | null,
): Promise<{ hasCredits: boolean; currentCredits: number; teamId?: string; workspaceId?: string; creditMode?: 'personal' | 'shared' }> {
  const result = await getUserCredits(supabase, userId, workspaceId);
  if (!result) return { hasCredits: false, currentCredits: 0 };
  return {
    hasCredits: result.credits >= requiredCredits,
    currentCredits: result.credits,
    teamId: result.teamId,
    workspaceId: result.workspaceId,
    creditMode: result.creditMode,
  };
}

export async function deductUserCredits(
  supabase: any,
  userId: string,
  amount: number,
  workspaceId?: string | null,
): Promise<{ success: boolean; newCredits: number; error?: string }> {
  const wsId = workspaceId ?? null;
  const ws = await resolveWorkspace(supabase, wsId);

  // Shared workspace pool
  if (ws && ws.credit_mode === 'shared') {
    // Check member monthly limit
    const { data: member } = await supabase
      .from('workspace_members')
      .select('monthly_credit_limit, credits_used_this_month')
      .eq('workspace_id', ws.id)
      .eq('user_id', userId)
      .maybeSingle();

    if (member?.monthly_credit_limit != null) {
      const used = member.credits_used_this_month ?? 0;
      if (used + amount > member.monthly_credit_limit) {
        return { success: false, newCredits: ws.shared_credits ?? 0, error: 'Limite mensal de créditos do workspace atingido.' };
      }
    }

    const current = ws.shared_credits ?? 0;
    if (current < amount) {
      return { success: false, newCredits: current, error: 'Créditos compartilhados insuficientes.' };
    }
    const newCredits = current - amount;
    const { error: upErr } = await supabase
      .from('workspaces')
      .update({ shared_credits: newCredits })
      .eq('id', ws.id);
    if (upErr) return { success: false, newCredits: current, error: 'Erro ao deduzir créditos do workspace.' };

    if (member) {
      await supabase
        .from('workspace_members')
        .update({ credits_used_this_month: (member.credits_used_this_month ?? 0) + amount })
        .eq('workspace_id', ws.id)
        .eq('user_id', userId);
    }
    return { success: true, newCredits };
  }

  // Personal credits
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('credits, credits_expire_at')
    .eq('id', userId)
    .single();

  if (fetchError || !profile) return { success: false, newCredits: 0, error: 'Usuário não encontrado' };

  const effectiveCredits = getEffectiveCredits(profile.credits || 0, profile.credits_expire_at);
  const newCredits = effectiveCredits - amount;

  if (newCredits < 0) {
    if (areCreditsExpired(profile.credits_expire_at)) {
      return { success: false, newCredits: 0, error: 'Seus créditos expiraram. Adquira um novo pacote para continuar.' };
    }
    return { success: false, newCredits: effectiveCredits, error: 'Créditos insuficientes' };
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ credits: newCredits })
    .eq('id', userId);

  if (updateError) return { success: false, newCredits: effectiveCredits, error: 'Erro ao deduzir créditos' };
  return { success: true, newCredits };
}

export async function addUserCredits(
  supabase: any,
  userId: string,
  amount: number,
  setExpiration: boolean = true
): Promise<{ success: boolean; newCredits: number; error?: string }> {
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('credits, max_credits, credits_expire_at')
    .eq('id', userId)
    .single();

  if (fetchError || !profile) return { success: false, newCredits: 0, error: 'Usuário não encontrado' };

  const newCredits = amount;
  const currentMaxCredits = profile.max_credits || 0;
  const newMaxCredits = Math.max(currentMaxCredits, newCredits);

  const updateData: any = { credits: newCredits, max_credits: newMaxCredits };
  if (setExpiration) {
    const expireAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    updateData.credits_expire_at = expireAt;
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update(updateData)
    .eq('id', userId);

  if (updateError) return { success: false, newCredits: profile.credits || 0, error: 'Erro ao adicionar créditos' };
  return { success: true, newCredits };
}

export async function recordUserCreditUsage(
  supabase: any,
  params: {
    userId: string;
    teamId?: string;
    workspaceId?: string;
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
      workspace_id: params.workspaceId || null,
      action_type: params.actionType,
      credits_used: params.creditsUsed,
      credits_before: params.creditsBefore,
      credits_after: params.creditsAfter,
      description: params.description,
      metadata: params.metadata || {},
    });

  if (error) console.error('Failed to record credit usage:', error);
}
