import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.11.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// Import credit history utility
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
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

// Mapping from Stripe Product IDs to Plan IDs
const STRIPE_PRODUCT_TO_PLAN: Record<string, string> = {
  'prod_T9jUCs242AIVtk': 'basic',
  'prod_T9jXbWuVLAjyRy': 'pro',
  'prod_T9jXEcmoxn2ROu': 'enterprise'
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-11-20.acacia" });
    
    // Find customer by email
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found");
      return new Response(JSON.stringify({ 
        subscribed: false,
        message: "No Stripe customer found"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    // List active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      logStep("No active subscription found");
      return new Response(JSON.stringify({ 
        subscribed: false,
        message: "No active subscription"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const subscription = subscriptions.data[0];
    const subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
    
    // Validate subscription items exist
    if (!subscription.items?.data || subscription.items.data.length === 0) {
      logStep("No subscription items found");
      return new Response(JSON.stringify({ 
        subscribed: false,
        message: "Invalid subscription structure"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    
    const productId = subscription.items.data[0].price.product as string;
    const planId = STRIPE_PRODUCT_TO_PLAN[productId];
    
    logStep("Active subscription found", { 
      subscriptionId: subscription.id, 
      productId,
      planId,
      endDate: subscriptionEnd 
    });

    // Get user's profile to find team_id
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('team_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.team_id) {
      logStep("Error fetching profile or no team_id", { error: profileError });
      return new Response(JSON.stringify({ 
        subscribed: true,
        message: "Subscription active but no team found"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const teamId = profile.team_id;
    logStep("Found team", { teamId });

    // Get current team data to check for period changes
    const { data: currentTeam, error: teamError } = await supabaseClient
      .from('teams')
      .select('subscription_period_end, credits')
      .eq('id', teamId)
      .single();

    if (teamError) {
      logStep("Error fetching current team data", { error: teamError });
    }

    if (!planId) {
      logStep("Unknown product ID", { productId });
      return new Response(JSON.stringify({ 
        subscribed: true,
        message: "Subscription active but plan not recognized"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Get plan details
    const { data: plan, error: planError } = await supabaseClient
      .from('plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      logStep("Error fetching plan", { error: planError });
      return new Response(JSON.stringify({ 
        subscribed: true,
        message: "Subscription active but plan details not found"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Check if this is a new billing period (monthly renewal) using timestamps
    const stripePeriodTimestamp = new Date(subscriptionEnd).getTime();
    const dbPeriodTimestamp = currentTeam?.subscription_period_end 
      ? new Date(currentTeam.subscription_period_end).getTime() 
      : 0;
    const isNewPeriod = stripePeriodTimestamp > dbPeriodTimestamp;

    // Credit accumulation policy: accumulate up to 2x, reset if at limit
    const currentCredits = currentTeam?.credits || 0;
    const creditsToSet = isNewPeriod 
      ? (currentCredits >= (plan.credits * 2)
          ? plan.credits  // Reset to base if at max limit
          : Math.min(currentCredits + plan.credits, plan.credits * 2))
      : currentCredits;
    
    logStep("Credit reset decision", { 
      isNewPeriod, 
      currentPeriodEnd: currentTeam?.subscription_period_end,
      newPeriodEnd: subscriptionEnd,
      stripePeriodTimestamp,
      dbPeriodTimestamp,
      currentCredits: currentTeam?.credits,
      planCredits: plan.credits,
      creditsToSet,
      accumulationPolicy: 'up_to_2x'
    });

    // Update team with subscription info and credits
    const { error: updateError } = await supabaseClient
      .from('teams')
      .update({
        plan_id: planId,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        subscription_status: 'active',
        subscription_period_end: subscriptionEnd,
        credits: creditsToSet,
        updated_at: new Date().toISOString()
      })
      .eq('id', teamId);

    if (updateError) {
      logStep("Error updating team", { error: updateError });
      throw new Error(`Failed to update team: ${updateError.message}`);
    }

    logStep("Team updated successfully", { teamId, planId, creditsSet: creditsToSet });

    // Record credit reset in history if it was a new period
    if (isNewPeriod && currentTeam) {
      const creditsBefore = currentTeam.credits || 0;
      const creditsAdded = creditsToSet - creditsBefore;
      
      await recordCreditUsage(supabaseClient, {
        teamId,
        userId: user.id,
        actionType: 'MONTHLY_RESET',
        creditsUsed: -creditsAdded, // Negative because it's adding credits
        creditsBefore,
        creditsAfter: creditsToSet,
        description: 'Renovação mensal - créditos resetados',
        metadata: {
          plan_id: planId,
          previous_period_end: currentTeam.subscription_period_end,
          new_period_end: subscriptionEnd,
          subscription_id: subscription.id,
          reset_method: 'manual_check',
          stripe_subscription_status: subscription.status,
          credits_policy: 'accumulate_up_to_2x_with_reset',
          was_at_limit: currentCredits >= (plan.credits * 2),
          policy_action: currentCredits >= (plan.credits * 2) ? 'reset' : 'accumulate'
        }
      });
      
      logStep("Credit reset recorded in history", { 
        creditsBefore, 
        creditsAfter: creditsToSet,
        creditsAdded 
      });
    }

    return new Response(JSON.stringify({
      subscribed: true,
      plan_id: planId,
      subscription_end: subscriptionEnd,
      credits_reset: isNewPeriod,
      message: isNewPeriod 
        ? "Subscription verified, credits reset for new period"
        : "Subscription verified and team updated"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
