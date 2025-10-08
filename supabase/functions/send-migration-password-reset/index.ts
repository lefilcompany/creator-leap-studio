import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    console.log("Starting mass password reset for migration users");

    // Get all migration users who haven't received reset email yet
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email, name")
      .eq("migration_user", true)
      .is("password_reset_sent_at", null);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw profilesError;
    }

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Nenhum usuário pendente de reset de senha",
          count: 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    console.log(`Found ${profiles.length} users to send password reset`);

    const results = {
      success: 0,
      failed: 0,
      errors: [] as string[],
    };

    // Process each user
    for (const profile of profiles) {
      try {
        // Generate password reset link
        const { data: resetData, error: resetError } = await supabase.auth.admin.generateLink({
          type: 'recovery',
          email: profile.email,
          options: {
            redirectTo: `${Deno.env.get("SUPABASE_URL")}/auth/v1/verify`,
          }
        });

        if (resetError) {
          console.error(`Error generating reset link for ${profile.email}:`, resetError);
          results.failed++;
          results.errors.push(`${profile.email}: ${resetError.message}`);
          continue;
        }

        // Update profile with reset sent timestamp
        const { error: updateError } = await supabase
          .from("profiles")
          .update({ password_reset_sent_at: new Date().toISOString() })
          .eq("id", profile.id);

        if (updateError) {
          console.error(`Error updating profile for ${profile.email}:`, updateError);
          results.failed++;
          results.errors.push(`${profile.email}: Failed to update profile`);
          continue;
        }

        results.success++;
        console.log(`Successfully sent password reset to ${profile.email}`);
      } catch (error: any) {
        console.error(`Error processing ${profile.email}:`, error);
        results.failed++;
        results.errors.push(`${profile.email}: ${error.message || 'Unknown error'}`);
      }
    }

    console.log("Mass password reset completed:", results);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Emails de recuperação enviados com sucesso`,
        results: {
          total: profiles.length,
          success: results.success,
          failed: results.failed,
          errors: results.errors.slice(0, 10), // Limit errors shown
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error("Error in send-migration-password-reset:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Unknown error occurred'
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});