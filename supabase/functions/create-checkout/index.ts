import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Buscar team_id do usuário
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('team_id')
      .eq('id', user.id)
      .single();
    
    const teamId = profile?.team_id;
    if (!teamId) throw new Error("User has no team");
    logStep("Team ID found", { teamId });

    // Verificar se usuário é admin da equipe
    const { data: teamData, error: teamError } = await supabaseClient
      .from('teams')
      .select('admin_id')
      .eq('id', teamId)
      .single();

    if (teamError || !teamData) {
      throw new Error("Team not found");
    }

    if (teamData.admin_id !== user.id) {
      logStep("ERROR: User is not team admin", { userId: user.id, adminId: teamData.admin_id });
      throw new Error("Only team administrators can purchase plans");
    }
    logStep("User confirmed as team admin");

    const { type, price_id, plan_id, credits, return_url } = await req.json();
    if (!type || !['plan', 'custom'].includes(type)) {
      throw new Error("type is required and must be 'plan' or 'custom'");
    }
    logStep("Request data received", { type, price_id, plan_id, credits });

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-12-18.acacia" });
    
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
      logStep("No existing customer, will be created by Stripe");
    }

    const origin = req.headers.get("origin") || "http://localhost:3000";
    
    // Definir success_url baseado no contexto
    const successUrl = return_url 
      ? `${origin}${return_url}?success=true&session_id={CHECKOUT_SESSION_ID}`
      : `${origin}/credits?success=true&session_id={CHECKOUT_SESSION_ID}`;
    
    let session;

    if (type === 'plan') {
      // Compra de plano fixo
      if (!price_id || !plan_id) throw new Error("price_id and plan_id are required for plan purchase");
      
      session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        line_items: [
          {
            price: price_id,
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: successUrl,
        cancel_url: `${origin}/subscribe?canceled=true`,
        metadata: {
          team_id: teamId,
          user_id: user.id,
          purchase_type: 'plan',
          plan_id: plan_id,
          return_url: return_url || '/credits',
        }
      });
      logStep("Plan checkout session created", { sessionId: session.id });
    } else {
      // Compra avulsa
      if (!credits || credits < 20) throw new Error("credits is required and must be at least 20");
      
      const amountInCents = credits * 200; // R$ 2,00 por crédito = 200 centavos
      
      session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        line_items: [
          {
            price_data: {
              currency: 'brl',
              product_data: {
                name: `${credits} Créditos Creator`,
                description: `Compra avulsa de ${credits} créditos`,
              },
              unit_amount: amountInCents,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${origin}/credits?success=true&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/credits?canceled=true`,
        metadata: {
          team_id: teamId,
          user_id: user.id,
          purchase_type: 'custom',
          credits: credits.toString(),
        }
      });
      logStep("Custom checkout session created", { sessionId: session.id, credits, amount: amountInCents });
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-checkout", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
