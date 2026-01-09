import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify user is system admin
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      throw new Error("Unauthorized");
    }

    // Check if user has system role
    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "system")
      .single();

    if (!roleData) {
      throw new Error("Access denied - system role required");
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Get all active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      status: "active",
      limit: 100,
      expand: ["data.items.data.price"],
    });

    // Calculate Monthly Recurring Revenue (MRR)
    let mrr = 0;
    for (const sub of subscriptions.data) {
      for (const item of sub.items.data) {
        const price = item.price;
        if (price.recurring) {
          let monthlyAmount = price.unit_amount || 0;
          
          // Convert to monthly if needed
          if (price.recurring.interval === "year") {
            monthlyAmount = monthlyAmount / 12;
          } else if (price.recurring.interval === "week") {
            monthlyAmount = monthlyAmount * 4.33;
          } else if (price.recurring.interval === "day") {
            monthlyAmount = monthlyAmount * 30;
          }
          
          mrr += monthlyAmount * (item.quantity || 1);
        }
      }
    }

    // Get trialing subscriptions count
    const trialingSubscriptions = await stripe.subscriptions.list({
      status: "trialing",
      limit: 100,
    });

    // Get customer count
    const customers = await stripe.customers.list({ limit: 100 });

    // Get balance (pending payouts)
    const balance = await stripe.balance.retrieve();
    let pendingBalance = 0;
    for (const b of balance.pending) {
      pendingBalance += b.amount;
    }

    return new Response(
      JSON.stringify({
        mrr: mrr / 100, // Convert from cents to currency
        activeSubscriptions: subscriptions.data.length,
        trialingSubscriptions: trialingSubscriptions.data.length,
        totalCustomers: customers.data.length,
        pendingBalance: pendingBalance / 100,
        currency: "BRL",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
