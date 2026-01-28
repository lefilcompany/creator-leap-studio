import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@13.11.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { session_id } = await req.json();
    if (!session_id) throw new Error("session_id is required");
    logStep("Session ID received", { session_id });
    
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    
    const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });
    
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verificar se já foi processado
    const { data: existingPurchase } = await supabase
      .from('credit_purchases')
      .select('status')
      .eq('stripe_checkout_session_id', session_id)
      .single();

    if (existingPurchase?.status === 'completed') {
      logStep("Payment already processed");
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Payment already processed',
        already_processed: true
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Buscar sessão no Stripe
    const session = await stripe.checkout.sessions.retrieve(session_id);
    logStep("Stripe session retrieved", { payment_status: session.payment_status });
    
    if (session.payment_status !== 'paid') {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Payment not completed',
        payment_status: session.payment_status
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Extrair metadados - user_id agora é a referência principal
    const { user_id, purchase_type, plan_id, package_id, credits: customCredits, team_id } = session.metadata || {};
    if (!user_id || !purchase_type) {
      throw new Error("Invalid session metadata");
    }
    logStep("Metadata extracted", { user_id, purchase_type, plan_id, package_id, customCredits, team_id });
    
    // Determinar quantidade de créditos
    let creditsToAdd = 0;
    let effectivePlanId = plan_id || package_id; // Suporta ambos
    
    if ((purchase_type === 'plan' || purchase_type === 'credits') && effectivePlanId) {
      // Compra de pacote de créditos
      const { data: planData } = await supabase
        .from('plans')
        .select('credits')
        .eq('id', effectivePlanId)
        .single();
      creditsToAdd = planData?.credits || 0;
      logStep("Credits from package", { package_id: effectivePlanId, credits: creditsToAdd });
    } else if (purchase_type === 'custom' && customCredits) {
      // Compra avulsa com quantidade customizada
      creditsToAdd = parseInt(customCredits);
      logStep("Credits from custom purchase", { credits: creditsToAdd });
    }

    if (creditsToAdd === 0) {
      throw new Error("Could not determine credits to add");
    }

    // Buscar profile do usuário (não mais team)
    const { data: profile } = await supabase
      .from('profiles')
      .select('credits, team_id')
      .eq('id', user_id)
      .single();
    
    if (!profile) throw new Error("User profile not found");
    
    const creditsBefore = profile.credits || 0;
    const creditsAfter = creditsBefore + creditsToAdd;
    logStep("Credit calculation", { creditsBefore, creditsToAdd, creditsAfter });

    // Preparar atualização do profile
    const profileUpdate: any = { 
      credits: creditsAfter,
      updated_at: new Date().toISOString()
    };
    
    // Se for compra de plano, atualizar também plan_id, subscription_status e period_end
    if (purchase_type === 'plan' && plan_id) {
      profileUpdate.plan_id = plan_id;
      profileUpdate.subscription_status = 'active';
      profileUpdate.subscription_period_end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      profileUpdate.stripe_customer_id = session.customer as string;
      logStep("Adding plan subscription data to profile", { plan_id, subscription_period_end: profileUpdate.subscription_period_end });
    }

    // Atualizar profile do usuário (não mais team)
    const { error: updateError } = await supabase
      .from('profiles')
      .update(profileUpdate)
      .eq('id', user_id);

    if (updateError) throw updateError;
    logStep("Profile updated with credits and plan data");

    // Registrar compra - mantém team_id para compatibilidade se existir
    const { error: purchaseError } = await supabase
      .from('credit_purchases')
      .insert({
        team_id: profile.team_id || user_id, // Usar team_id se existir, senão user_id
        user_id,
        purchase_type,
        plan_id: plan_id || null,
        credits_purchased: creditsToAdd,
        amount_paid: (session.amount_total || 0) / 100,
        stripe_payment_intent_id: session.payment_intent as string || null,
        stripe_checkout_session_id: session_id,
        status: 'completed',
        completed_at: new Date().toISOString(),
      });

    if (purchaseError) throw purchaseError;
    logStep("Purchase recorded");

    // Registrar em credit_history com user_id como referência principal
    const { error: historyError } = await supabase
      .from('credit_history')
      .insert({
        user_id,
        team_id: profile.team_id || user_id, // Mantém compatibilidade
        action_type: 'purchase',
        credits_used: -creditsToAdd, // Negativo pois é adição
        credits_before: creditsBefore,
        credits_after: creditsAfter,
        description: purchase_type === 'plan' 
          ? `Compra do plano ${plan_id}` 
          : `Compra avulsa de ${creditsToAdd} créditos`,
        metadata: {
          stripe_session_id: session_id,
          purchase_type,
          plan_id: plan_id || null,
        }
      });

    if (historyError) throw historyError;
    logStep("Credit history recorded");

    return new Response(JSON.stringify({ 
      success: true,
      credits_added: creditsToAdd,
      new_balance: creditsAfter
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in verify-payment", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
