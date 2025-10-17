import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    // Get user from auth header
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (userError || !user) {
      throw new Error("Invalid user");
    }

    const { newAdminId } = await req.json();

    // Get user's team info
    const { data: profile } = await supabase
      .from("profiles")
      .select("team_id")
      .eq("id", user.id)
      .single();

    if (!profile?.team_id) {
      throw new Error("User has no team");
    }

    // Get team info to check if user is admin
    const { data: team } = await supabase
      .from("teams")
      .select("admin_id")
      .eq("id", profile.team_id)
      .single();

    // If user is admin and there's a new admin selected, transfer ownership
    if (team?.admin_id === user.id && newAdminId) {
      // Update team admin
      await supabase
        .from("teams")
        .update({ admin_id: newAdminId })
        .eq("id", profile.team_id);

      // Remove admin role from current user
      await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", user.id)
        .eq("role", "admin");

      // Add admin role to new admin
      await supabase
        .from("user_roles")
        .insert({
          user_id: newAdminId,
          role: "admin"
        });
    }

    // Remove user from team (this blocks access without deleting data)
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ team_id: null })
      .eq("id", user.id);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({ success: true, message: "Account deactivated successfully" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error deactivating account:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
