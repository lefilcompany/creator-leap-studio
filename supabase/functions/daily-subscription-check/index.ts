import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.11.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { recordUserCreditUsage } from '../_shared/userCredits.ts';

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

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-11-20.acacia" });

    // Buscar todos os USUÁRIOS com assinaturas Stripe ativas (não mais teams)
    const { data: profiles, error: profilesError } = await supabaseClient
      .from('profiles')
      .select('id, name, email, plan_id, stripe_customer_id, stripe_subscription_id, subscription_period_end, credits, team_id')
      .not('stripe_subscription_id', 'is', null);

    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`);
    }

    if (!profiles || profiles.length === 0) {
      logStep("No users with active subscriptions found");
      return new Response(JSON.stringify({ 
        message: "No users to check",
        users_checked: 0 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    logStep(`Found ${profiles.length} users to check`);

    const results = {
      users_checked: profiles.length,
      credits_reset: 0,
      errors: [] as any[],
      details: [] as any[]
    };

    // Check each user
    for (const profile of profiles) {
      try {
        logStep(`Checking user: ${profile.name}`, { userId: profile.id });

        // Fetch subscription from Stripe
        const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
        
        if (subscription.status !== 'active') {
          logStep(`User subscription not active`, { userId: profile.id, status: subscription.status });
          continue;
        }

        const stripeCurrentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
        
        // Compare dates using timestamps to avoid timezone issues
        const stripePeriodTimestamp = new Date(stripeCurrentPeriodEnd).getTime();
        const dbPeriodTimestamp = profile.subscription_period_end 
          ? new Date(profile.subscription_period_end).getTime() 
          : 0;

        const isNewPeriod = stripePeriodTimestamp > dbPeriodTimestamp;

        if (isNewPeriod) {
          logStep(`New billing period detected for user: ${profile.name}`, {
            userId: profile.id,
            oldPeriodEnd: profile.subscription_period_end,
            newPeriodEnd: stripeCurrentPeriodEnd
          });

          // Fetch plan credits
          const { data: plan, error: planError } = await supabaseClient
            .from('plans')
            .select('credits')
            .eq('id', profile.plan_id)
            .single();

          if (planError || !plan) {
            throw new Error(`Failed to fetch plan: ${planError?.message}`);
          }

          // Credit accumulation policy: accumulate up to 2x, reset if at limit
          const creditsBefore = profile.credits || 0;
          const creditsAfter = creditsBefore >= (plan.credits * 2)
            ? plan.credits  // Reset to base if at max limit
            : Math.min(creditsBefore + plan.credits, plan.credits * 2);

          // Atualizar PROFILE do usuário (não mais team)
          const { error: updateError } = await supabaseClient
            .from('profiles')
            .update({
              subscription_period_end: stripeCurrentPeriodEnd,
              credits: creditsAfter,
              updated_at: new Date().toISOString()
            })
            .eq('id', profile.id);

          if (updateError) {
            throw new Error(`Failed to update profile: ${updateError.message}`);
          }

          // Record in credit history
          await recordUserCreditUsage(supabaseClient, {
            userId: profile.id,
            teamId: profile.team_id || undefined,
            actionType: 'MONTHLY_RESET',
            creditsUsed: -(creditsAfter - creditsBefore),
            creditsBefore,
            creditsAfter,
            description: 'Renovação mensal automática - créditos resetados',
            metadata: {
              plan_id: profile.plan_id,
              previous_period_end: profile.subscription_period_end,
              new_period_end: stripeCurrentPeriodEnd,
              subscription_id: profile.stripe_subscription_id,
              reset_method: 'daily_cron',
              stripe_subscription_status: subscription.status,
              stripe_current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
              credits_policy: 'accumulate_up_to_2x_with_reset',
              was_at_limit: creditsBefore >= (plan.credits * 2),
              policy_action: creditsBefore >= (plan.credits * 2) ? 'reset' : 'accumulate'
            }
          });

          // Create notification for user
          await supabaseClient
            .from('notifications')
            .insert({
              user_id: profile.id,
              team_id: profile.team_id,
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
            user_id: profile.id,
            user_name: profile.name,
            credits_before: creditsBefore,
            credits_after: creditsAfter,
            new_period_end: stripeCurrentPeriodEnd
          });

          logStep(`Credits reset successfully for user: ${profile.name}`, {
            userId: profile.id,
            creditsBefore,
            creditsAfter
          });
        } else {
          logStep(`No period change for user: ${profile.name}`, { userId: profile.id });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logStep(`Error processing user ${profile.name}`, { error: errorMessage });
        results.errors.push({
          user_id: profile.id,
          user_name: profile.name,
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
