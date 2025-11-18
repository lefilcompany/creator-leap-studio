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

    // Extrair metadados
    const { team_id, user_id, purchase_type, plan_id, credits: customCredits } = session.metadata || {};
    if (!team_id || !user_id || !purchase_type) {
      throw new Error("Invalid session metadata");
    }
    logStep("Metadata extracted", { team_id, user_id, purchase_type, plan_id, customCredits });
    
    // Determinar quantidade de créditos
    let creditsToAdd = 0;
    
    if (purchase_type === 'plan' && plan_id) {
      const { data: planData } = await supabase
        .from('plans')
        .select('credits')
        .eq('id', plan_id)
        .single();
      creditsToAdd = planData?.credits || 0;
      logStep("Credits from plan", { plan_id, credits: creditsToAdd });
    } else if (purchase_type === 'custom' && customCredits) {
      creditsToAdd = parseInt(customCredits);
      logStep("Credits from custom purchase", { credits: creditsToAdd });
    }

    if (creditsToAdd === 0) {
      throw new Error("Could not determine credits to add");
    }

    // Buscar team atual
    const { data: team } = await supabase
      .from('teams')
      .select('credits')
      .eq('id', team_id)
      .single();
    
    if (!team) throw new Error("Team not found");
    
    const creditsBefore = team.credits || 0;
    const creditsAfter = creditsBefore + creditsToAdd;
    logStep("Credit calculation", { creditsBefore, creditsToAdd, creditsAfter });

    // Preparar atualização da equipe
    const teamUpdate: any = { credits: creditsAfter };
    
    // Se for compra de plano, atualizar também plan_id, subscription_status e period_end
    if (purchase_type === 'plan' && plan_id) {
      teamUpdate.plan_id = plan_id;
      teamUpdate.subscription_status = 'active';
      // 30 dias a partir de agora
      teamUpdate.subscription_period_end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      logStep("Adding plan subscription data", { plan_id, subscription_period_end: teamUpdate.subscription_period_end });
    }

    // Adicionar créditos e atualizar plano (se aplicável)
    const { error: updateError } = await supabase
      .from('teams')
      .update(teamUpdate)
      .eq('id', team_id);

    if (updateError) throw updateError;
    logStep("Team updated with credits and plan data");

    // Registrar compra
    const { error: purchaseError } = await supabase
      .from('credit_purchases')
      .insert({
        team_id,
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

    // Registrar em credit_history
    const { error: historyError } = await supabase
      .from('credit_history')
      .insert({
        team_id,
        user_id,
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
