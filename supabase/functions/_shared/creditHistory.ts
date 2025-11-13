import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

export async function recordCreditUsage(
  supabase: any, // Changed from SupabaseClient to any to avoid type issues
  params: {
    teamId: string;
    userId: string;
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
      team_id: params.teamId,
      user_id: params.userId,
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
