import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

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

    // Get user's team info
    const { data: profile } = await supabase
      .from("profiles")
      .select("team_id")
      .eq("id", user.id)
      .single();

    // Check if user is the only admin of the team
    if (profile?.team_id) {
      const { data: team } = await supabase
        .from("teams")
        .select("admin_id")
        .eq("id", profile.team_id)
        .single();

      if (team?.admin_id === user.id) {
        // Count team members
        const { count } = await supabase
          .from("profiles")
          .select("id", { count: "exact", head: true })
          .eq("team_id", profile.team_id)
          .neq("id", user.id);

        if (count && count > 0) {
          throw new Error("You must transfer team ownership before deleting your account");
        }

        // Delete the team if user is the only member
        await supabase
          .from("teams")
          .delete()
          .eq("id", profile.team_id);
      }
    }

    // Delete user's data in cascade
    // The database foreign keys with ON DELETE CASCADE will handle:
    // - brands, personas, strategic_themes, actions (via team_id)
    // - notifications, user_roles (via user_id)
    // - team_join_requests (via user_id)
    
    // Delete user profile (this cascades to other tables)
    await supabase
      .from("profiles")
      .delete()
      .eq("id", user.id);

    // Delete auth user (this is the final step)
    const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(
      user.id
    );

    if (deleteAuthError) {
      throw deleteAuthError;
    }

    return new Response(
      JSON.stringify({ success: true, message: "Account deleted successfully" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error deleting account:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
