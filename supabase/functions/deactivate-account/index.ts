import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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

    console.log('🔍 [Deactivate] User ID:', user.id);
    console.log('🔍 [Deactivate] New Admin ID:', newAdminId);

    // Get user's team info
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("team_id")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error('❌ [Deactivate] Profile error:', profileError);
      throw new Error("Error fetching user profile");
    }

    if (!profile?.team_id) {
      console.log('⚠️ [Deactivate] User has no team');
      throw new Error("User has no team");
    }

    console.log('🔍 [Deactivate] Team ID:', profile.team_id);

    // Get team info to check if user is admin
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("admin_id")
      .eq("id", profile.team_id)
      .single();

    if (teamError) {
      console.error('❌ [Deactivate] Team error:', teamError);
      throw new Error("Error fetching team info");
    }

    console.log('🔍 [Deactivate] Team admin ID:', team?.admin_id);
    console.log('🔍 [Deactivate] Is user admin?', team?.admin_id === user.id);

    // If user is admin, handle admin transfer
    if (team?.admin_id === user.id) {
      if (newAdminId) {
        // Validate that new admin is part of the team
        const { data: newAdmin, error: newAdminError } = await supabase
          .from("profiles")
          .select("id, team_id")
          .eq("id", newAdminId)
          .eq("team_id", profile.team_id)
          .single();

        if (newAdminError || !newAdmin) {
          console.error('❌ [Deactivate] New admin validation failed:', newAdminError);
          throw new Error("Selected user is not part of the team");
        }

        console.log('✅ [Deactivate] New admin validated:', newAdminId);

        // Update team admin
        const { error: updateTeamError } = await supabase
          .from("teams")
          .update({ admin_id: newAdminId })
          .eq("id", profile.team_id);

        if (updateTeamError) {
          console.error('❌ [Deactivate] Update team error:', updateTeamError);
          throw new Error("Failed to transfer admin role");
        }

        console.log('✅ [Deactivate] Team admin updated');

        // Remove admin role from current user (if exists)
        const { error: deleteRoleError } = await supabase
          .from("user_roles")
          .delete()
          .eq("user_id", user.id)
          .eq("role", "admin");

        if (deleteRoleError) {
          console.error('⚠️ [Deactivate] Delete role error (non-critical):', deleteRoleError);
        } else {
          console.log('✅ [Deactivate] Old admin role removed');
        }

        // Add admin role to new admin
        const { error: insertRoleError } = await supabase
          .from("user_roles")
          .insert({
            user_id: newAdminId,
            role: "admin"
          });

        if (insertRoleError) {
          console.error('❌ [Deactivate] Insert role error:', insertRoleError);
          throw new Error("Failed to assign admin role to new admin");
        }

        console.log('✅ [Deactivate] New admin role assigned');
      } else {
        // Admin without selecting new admin - check if there are other members
        const { data: otherMembers } = await supabase
          .from("profiles")
          .select("id")
          .eq("team_id", profile.team_id)
          .neq("id", user.id);

        if (otherMembers && otherMembers.length > 0) {
          console.error('❌ [Deactivate] Admin must select new admin');
          throw new Error("As team admin, you must select a new administrator");
        }
        
        console.log('⚠️ [Deactivate] Admin is sole member, proceeding');
      }
    }

    // Remove user from team (this blocks access without deleting data)
    console.log('🔄 [Deactivate] Removing user from team');
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ team_id: null })
      .eq("id", user.id);

    if (updateError) {
      console.error('❌ [Deactivate] Update profile error:', updateError);
      throw updateError;
    }

    console.log('✅ [Deactivate] Account deactivated successfully');

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
      JSON.stringify({ error: error instanceof Error ? error.message : String(error) }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
