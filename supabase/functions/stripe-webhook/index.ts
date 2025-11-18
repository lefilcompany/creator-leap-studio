import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.11.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

// Mapeamento de produtos Stripe para planos
const productToPlanMap: Record<string, { planId: string, credits: number }> = {
  'prod_TQFRF4g5MPxoSG': { planId: 'pack_basic', credits: 80 },
  'prod_TQFSnXcPofocWV': { planId: 'pack_pro', credits: 160 },
  'prod_TQFSDtV5XhpDH0': { planId: 'pack_premium', credits: 320 },
  'prod_TQFTk9Rh4tMH3U': { planId: 'pack_business', credits: 640 },
  'prod_TQFTH5994CZA2y': { planId: 'pack_enterprise', credits: 1280 },
};

serve(async (req) => {
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Webhook started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-11-20.acacia" });

    // Get the signature from the headers
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      throw new Error("No stripe-signature header found");
    }

    const body = await req.text();
    
    let event: Stripe.Event;
    
    // Verify webhook signature if secret is configured
    if (webhookSecret) {
      try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      } catch (err) {
        logStep("Webhook signature verification failed", { error: err });
        return new Response(JSON.stringify({ error: "Invalid signature" }), {
          status: 400,
        });
      }
    } else {
      event = JSON.parse(body);
    }

    logStep("Event received", { type: event.type, id: event.id });

    // Handle checkout.session.completed event
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      logStep("Checkout session completed", { 
        sessionId: session.id,
        customerId: session.customer,
        customerEmail: session.customer_email,
        paymentStatus: session.payment_status 
      });

      // Only process if payment was successful
      if (session.payment_status !== 'paid') {
        logStep("Payment not completed", { paymentStatus: session.payment_status });
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      // Get customer email
      const customerEmail = session.customer_email || session.customer_details?.email;
      
      if (!customerEmail) {
        logStep("No customer email found");
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      logStep("Processing payment for", { email: customerEmail });

      // Find user by email
      const { data: profile, error: profileError } = await supabaseClient
        .from('profiles')
        .select('id, team_id')
        .eq('email', customerEmail)
        .single();

      if (profileError || !profile) {
        logStep("User not found", { email: customerEmail, error: profileError });
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      if (!profile.team_id) {
        logStep("User has no team", { userId: profile.id });
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      // Get line items to find product
      const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 });
      
      if (lineItems.data.length === 0) {
        logStep("No line items found");
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      const price = lineItems.data[0].price;
      if (!price || typeof price.product !== 'string') {
        logStep("No product found in line item");
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      const productId = price.product;
      const planInfo = productToPlanMap[productId];

      if (!planInfo) {
        logStep("Product not found in mapping", { productId });
        return new Response(JSON.stringify({ received: true }), { status: 200 });
      }

      logStep("Plan identified", { planId: planInfo.planId, credits: planInfo.credits });

      // Get current team data
      const { data: currentTeam } = await supabaseClient
        .from('teams')
        .select('credits')
        .eq('id', profile.team_id)
        .single();

      const creditsBefore = currentTeam?.credits || 0;
      const creditsAfter = creditsBefore + planInfo.credits;

      // Update team with new credits and plan
      const { error: updateError } = await supabaseClient
        .from('teams')
        .update({
          credits: creditsAfter,
          plan_id: planInfo.planId,
          subscription_status: 'active',
          subscription_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.team_id);

      if (updateError) {
        logStep("Error updating team", { error: updateError });
        throw updateError;
      }

      // Record credit purchase
      const { error: purchaseError } = await supabaseClient
        .from('credit_purchases')
        .insert({
          team_id: profile.team_id,
          user_id: profile.id,
          credits_purchased: planInfo.credits,
          amount_paid: session.amount_total ? session.amount_total / 100 : 0,
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id: session.payment_intent as string,
          status: 'completed',
          completed_at: new Date().toISOString(),
          purchase_type: 'plan',
          plan_id: planInfo.planId,
        });

      if (purchaseError) {
        logStep("Error recording purchase", { error: purchaseError });
      }

      // Record credit history
      const { error: historyError } = await supabaseClient
        .from('credit_history')
        .insert({
          team_id: profile.team_id,
          user_id: profile.id,
          action_type: 'COMPRA_CREDITOS',
          credits_used: -planInfo.credits, // Negative because it's an addition
          credits_before: creditsBefore,
          credits_after: creditsAfter,
          description: `Compra do plano ${planInfo.planId}`,
          metadata: {
            session_id: session.id,
            plan_id: planInfo.planId,
          }
        });

      if (historyError) {
        logStep("Error recording history", { error: historyError });
      }

      // Create notification
      const { error: notificationError } = await supabaseClient
        .from('notifications')
        .insert({
          user_id: profile.id,
          team_id: profile.team_id,
          type: 'payment_success',
          title: 'Pagamento confirmado!',
          message: `Seu pagamento foi processado e ${planInfo.credits} créditos foram adicionados à sua conta.`,
          metadata: {
            credits: planInfo.credits,
            plan_id: planInfo.planId,
          }
        });

      if (notificationError) {
        logStep("Error creating notification", { error: notificationError });
      }

      logStep("Payment processed successfully", {
        teamId: profile.team_id,
        creditsAdded: planInfo.credits,
        newTotal: creditsAfter
      });
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in webhook", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
});
