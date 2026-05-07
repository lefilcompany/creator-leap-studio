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

/**
 * Centralized credit deduction.
 * Delegates to the `consume_workspace_credits` RPC, which:
 *  - resolves the active workspace and credit_mode
 *  - enforces monthly_credit_limit in shared mode (owner exempt; NULL = blocked)
 *  - performs lazy monthly reset of credits_used_this_month
 *  - records into credit_history automatically
 *
 * Use this for ALL AI generation flows. Do not write directly to
 * profiles.credits or workspaces.shared_credits in edge functions.
 */
export async function deductUserCredits(
  supabase: any,
  userId: string,
  amount: number,
  workspaceId?: string | null,
  options?: { actionType?: string; referenceId?: string | null; metadata?: Record<string, unknown> },
): Promise<{ success: boolean; newCredits: number; error?: string; workspaceId?: string; creditMode?: 'personal' | 'shared' }> {
  const wsId = await resolveActiveWorkspaceId(supabase, userId, workspaceId);

  const { data, error } = await supabase.rpc('consume_workspace_credits', {
    p_workspace_id: wsId,
    p_user_id: userId,
    p_amount: amount,
    p_action_type: options?.actionType ?? 'generation',
    p_reference_id: options?.referenceId ?? null,
    p_metadata: options?.metadata ?? {},
  });

  if (error) {
    console.error('consume_workspace_credits error:', error);
    return { success: false, newCredits: 0, error: error.message || 'Erro ao deduzir créditos' };
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { success: false, newCredits: 0, error: 'Resposta vazia da RPC de créditos' };

  return {
    success: !!row.success,
    newCredits: row.new_balance ?? 0,
    error: row.error ?? undefined,
    workspaceId: wsId ?? undefined,
    creditMode: (row.credit_mode as 'personal' | 'shared') ?? undefined,
  };
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

/**
 * @deprecated Histórico já é gravado automaticamente por `consume_workspace_credits`.
 * Mantido como no-op para compatibilidade com edge functions existentes.
 */
export async function recordUserCreditUsage(
  _supabase: any,
  _params: {
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
  // No-op: a RPC consume_workspace_credits já insere em credit_history.
  return;
}
