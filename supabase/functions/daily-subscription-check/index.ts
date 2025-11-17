import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// Utility function to record credit usage in history
async function recordCreditUsage(
  supabase: any,
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

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[DAILY-SUBSCRIPTION-CHECK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Fetch all teams with active Stripe subscriptions
    const { data: teams, error: teamsError } = await supabaseClient
      .from('teams')
      .select('id, name, admin_id, plan_id, stripe_customer_id, stripe_subscription_id, subscription_period_end, credits')
      .not('stripe_subscription_id', 'is', null);

    if (teamsError) {
      throw new Error(`Failed to fetch teams: ${teamsError.message}`);
    }

    if (!teams || teams.length === 0) {
      logStep("No teams with active subscriptions found");
      return new Response(JSON.stringify({ 
        message: "No teams to check",
        teams_checked: 0 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep(`Found ${teams.length} teams to check`);

    const results = {
      teams_checked: teams.length,
      credits_reset: 0,
      errors: [] as any[],
      details: [] as any[]
    };

    // Check each team
    for (const team of teams) {
      try {
        logStep(`Checking team: ${team.name}`, { teamId: team.id });

        // Fetch subscription from Stripe
        const subscription = await stripe.subscriptions.retrieve(team.stripe_subscription_id);
        
        if (subscription.status !== 'active') {
          logStep(`Team subscription not active`, { teamId: team.id, status: subscription.status });
          continue;
        }

        const stripeCurrentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
        
        // Compare dates using timestamps to avoid timezone issues
        const stripePeriodTimestamp = new Date(stripeCurrentPeriodEnd).getTime();
        const dbPeriodTimestamp = team.subscription_period_end 
          ? new Date(team.subscription_period_end).getTime() 
          : 0;

        const isNewPeriod = stripePeriodTimestamp > dbPeriodTimestamp;

        if (isNewPeriod) {
          logStep(`New billing period detected for team: ${team.name}`, {
            teamId: team.id,
            oldPeriodEnd: team.subscription_period_end,
            newPeriodEnd: stripeCurrentPeriodEnd
          });

          // Fetch plan credits
          const { data: plan, error: planError } = await supabaseClient
            .from('plans')
            .select('credits')
            .eq('id', team.plan_id)
            .single();

          if (planError || !plan) {
            throw new Error(`Failed to fetch plan: ${planError?.message}`);
          }

          const creditsBefore = team.credits || 0;
          const creditsAfter = plan.credits;

          // Update team with new period and reset credits
          const { error: updateError } = await supabaseClient
            .from('teams')
            .update({
              subscription_period_end: stripeCurrentPeriodEnd,
              credits: creditsAfter,
              updated_at: new Date().toISOString()
            })
            .eq('id', team.id);

          if (updateError) {
            throw new Error(`Failed to update team: ${updateError.message}`);
          }

          // Record in credit history
          await recordCreditUsage(supabaseClient, {
            teamId: team.id,
            userId: team.admin_id,
            actionType: 'MONTHLY_RESET',
            creditsUsed: -(creditsAfter - creditsBefore),
            creditsBefore,
            creditsAfter,
            description: 'Renovação mensal automática - créditos resetados',
            metadata: {
              plan_id: team.plan_id,
              previous_period_end: team.subscription_period_end,
              new_period_end: stripeCurrentPeriodEnd,
              subscription_id: team.stripe_subscription_id,
              reset_method: 'daily_cron'
            }
          });

          // Create notification for admin
          await supabaseClient
            .from('notifications')
            .insert({
              user_id: team.admin_id,
              team_id: team.id,
              type: 'credits_reset',
              title: 'Créditos renovados!',
              message: `Seus créditos foram renovados automaticamente. Novo saldo: ${creditsAfter} créditos.`,
              metadata: {
                credits_added: creditsAfter - creditsBefore,
                new_balance: creditsAfter,
                period_end: stripeCurrentPeriodEnd
              }
            });

          results.credits_reset++;
          results.details.push({
            team_id: team.id,
            team_name: team.name,
            credits_before: creditsBefore,
            credits_after: creditsAfter,
            new_period_end: stripeCurrentPeriodEnd
          });

          logStep(`Credits reset successfully for team: ${team.name}`, {
            teamId: team.id,
            creditsBefore,
            creditsAfter
          });
        } else {
          logStep(`No period change for team: ${team.name}`, { teamId: team.id });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logStep(`Error processing team ${team.name}`, { error: errorMessage });
        results.errors.push({
          team_id: team.id,
          team_name: team.name,
          error: errorMessage
        });
      }
    }

    logStep("Daily check completed", results);

    return new Response(JSON.stringify({
      success: true,
      message: "Daily subscription check completed",
      ...results
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in daily-subscription-check", { message: errorMessage });
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
