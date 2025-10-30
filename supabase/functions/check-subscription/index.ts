import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

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

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
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

    // Update team with subscription info and credits
    const { error: updateError } = await supabaseClient
      .from('teams')
      .update({
        plan_id: planId,
        stripe_customer_id: customerId,
        stripe_subscription_id: subscription.id,
        subscription_status: 'active',
        subscription_period_end: subscriptionEnd,
        credits_quick_content: plan.credits_quick_content,
        credits_suggestions: plan.credits_suggestions,
        credits_reviews: plan.credits_reviews,
        credits_plans: plan.credits_plans,
        credits_videos: plan.credits_videos,
        updated_at: new Date().toISOString()
      })
      .eq('id', teamId);

    if (updateError) {
      logStep("Error updating team", { error: updateError });
      throw new Error(`Failed to update team: ${updateError.message}`);
    }

    logStep("Team updated successfully", { teamId, planId });

    return new Response(JSON.stringify({
      subscribed: true,
      plan_id: planId,
      subscription_end: subscriptionEnd,
      message: "Subscription verified and team updated"
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
