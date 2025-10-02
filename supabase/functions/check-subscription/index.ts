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

// Mapeamento de Stripe Product ID para Plan ID
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
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found");
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    
    const hasActiveSub = subscriptions.data.length > 0;
    let productId = null;
    let subscriptionEnd = null;
    let planId = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      logStep("Active subscription found", { subscriptionId: subscription.id, endDate: subscriptionEnd });
      
      productId = subscription.items.data[0].price.product as string;
      planId = STRIPE_PRODUCT_TO_PLAN[productId] || null;
      logStep("Determined subscription tier", { productId, planId });

      // Buscar team_id do usuário
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('team_id')
        .eq('id', user.id)
        .single();

      if (profile?.team_id && planId) {
        // Buscar créditos do novo plano
        const { data: planData } = await supabaseClient
          .from('plans')
          .select('credits_quick_content, credits_suggestions, credits_plans, credits_reviews')
          .eq('id', planId)
          .single();

        if (planData) {
          // Atualizar team com novo plano e restaurar créditos
          const { error: updateError } = await supabaseClient
            .from('teams')
            .update({
              plan_id: planId,
              subscription_period_end: subscriptionEnd,
              subscription_status: subscription.status,
              stripe_subscription_id: subscription.id,
              stripe_customer_id: customerId,
              credits_quick_content: planData.credits_quick_content,
              credits_suggestions: planData.credits_suggestions,
              credits_plans: planData.credits_plans,
              credits_reviews: planData.credits_reviews,
            })
            .eq('id', profile.team_id);

          if (updateError) {
            logStep("Error updating team", { error: updateError });
          } else {
            logStep("Team updated successfully with new plan and credits");
          }
        }
      }
    } else {
      logStep("No active subscription found");
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      product_id: productId,
      plan_id: planId,
      subscription_end: subscriptionEnd
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
