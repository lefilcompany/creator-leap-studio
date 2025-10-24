import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string);
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: corsHeaders,
      status: 200
    });
  }

  if (req.method !== 'POST') {
    return new Response('not allowed', { 
      status: 400,
      headers: corsHeaders
    });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    console.log('Generating password reset link for:', email);

    // Generate password reset link using Supabase Admin
    const { data, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: `${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app')}/reset-password`,
      }
    });

    if (resetError || !data.properties?.action_link) {
      console.error('Error generating reset link:', resetError);
      return new Response(
        JSON.stringify({ error: 'Failed to generate reset link' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const confirmationUrl = data.properties.action_link;
    console.log('Reset link generated successfully');

    // HTML email template
    const htmlTemplate = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Redefina sua Senha - Creator IA</title>
</head>
<body style="margin: 0; padding: 0; background: linear-gradient(135deg, #F5E6F0 0%, #E8DEFF 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', Helvetica, Arial, sans-serif;">
  <!-- Wrapper Table -->
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #F5E6F0 0%, #E8DEFF 100%); min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        
        <!-- Main Card Table -->
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="background: linear-gradient(180deg, #FFFFFF 0%, #FEFCFF 100%); border-radius: 16px; max-width: 600px; width: 100%; box-shadow: 0 20px 60px rgba(194, 22, 96, 0.15), 0 0 0 1px rgba(194, 22, 96, 0.1);">
          
          <!-- Logo Row with Gradient Background -->
          <tr>
            <td align="center" style="padding: 48px 30px 32px 30px; background: linear-gradient(135deg, #C21660 0%, #7445C4 100%); border-top-left-radius: 16px; border-top-right-radius: 16px;">
              <img src="https://afxwqkrneraatgovhpkb.supabase.co/storage/v1/object/public/content-images/logoCreatorPreta.png" alt="Creator IA" width="160" style="display: block; max-width: 160px; height: auto; border: 0; filter: brightness(0) invert(1);">
            </td>
          </tr>
          
          <!-- Title Row -->
          <tr>
            <td align="center" style="padding: 40px 30px 24px 30px;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; background: linear-gradient(135deg, #C21660 0%, #7445C4 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', Helvetica, Arial, sans-serif;">Redefina sua Senha</h1>
            </td>
          </tr>
          
          <!-- Body Text Row -->
          <tr>
            <td style="padding: 0 40px 32px 40px;">
              <p style="margin: 0; font-size: 16px; color: #374151; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', Helvetica, Arial, sans-serif; text-align: center;">
                Olá! Recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para escolher uma nova senha:
              </p>
            </td>
          </tr>
          
          <!-- Button Row -->
          <tr>
            <td align="center" style="padding: 0 40px 32px 40px;">
              <!-- Button as Table for maximum compatibility -->
              <table border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="background: linear-gradient(135deg, #C21660 0%, #7445C4 100%); border-radius: 12px; box-shadow: 0 8px 24px rgba(194, 22, 96, 0.3);">
                    <a href="${confirmationUrl}" target="_blank" style="display: inline-block; padding: 16px 40px; font-size: 16px; color: #FFFFFF; text-decoration: none; font-weight: 600; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', Helvetica, Arial, sans-serif; letter-spacing: 0.5px;">
                      Redefinir Senha
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Divider -->
          <tr>
            <td style="padding: 0 40px;">
              <div style="height: 1px; background: linear-gradient(90deg, transparent 0%, rgba(194, 22, 96, 0.2) 50%, transparent 100%);"></div>
            </td>
          </tr>
          
          <!-- Alternative Link Row -->
          <tr>
            <td style="padding: 32px 40px 24px 40px;">
              <p style="margin: 0 0 12px 0; font-size: 14px; color: #6B7280; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', Helvetica, Arial, sans-serif; text-align: center;">
                Se o botão não funcionar, copie e cole este link no seu navegador:
              </p>
              <p style="margin: 0; font-size: 12px; color: #7445C4; line-height: 1.6; word-break: break-all; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', Helvetica, Arial, sans-serif; text-align: center; background-color: #F9FAFB; padding: 12px; border-radius: 8px; border: 1px solid #E5E7EB;">
                ${confirmationUrl}
              </p>
            </td>
          </tr>
          
          <!-- Footer Row -->
          <tr>
            <td style="padding: 24px 40px 40px 40px;">
              <p style="margin: 0; font-size: 14px; color: #9CA3AF; line-height: 1.5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', Helvetica, Arial, sans-serif; text-align: center;">
                Se você não solicitou isso, pode ignorar este e-mail com segurança.
              </p>
            </td>
          </tr>
          
          <!-- Bottom Footer with Gradient -->
          <tr>
            <td align="center" style="padding: 24px 30px; background: linear-gradient(135deg, rgba(194, 22, 96, 0.03) 0%, rgba(116, 69, 196, 0.03) 100%); border-bottom-left-radius: 16px; border-bottom-right-radius: 16px;">
              <p style="margin: 0 0 6px 0; font-size: 16px; background: linear-gradient(135deg, #C21660 0%, #7445C4 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; font-weight: 700; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', Helvetica, Arial, sans-serif;">
                Creator IA
              </p>
              <p style="margin: 0; font-size: 12px; color: #9CA3AF; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', Helvetica, Arial, sans-serif;">
                © 2025 Creator IA. Todos os direitos reservados.
              </p>
            </td>
          </tr>
          
        </table>
        <!-- End Main Card Table -->
        
      </td>
    </tr>
  </table>
  <!-- End Wrapper Table -->
</body>
</html>
    `;

    const { error } = await resend.emails.send({
      from: 'Creator IA <send@notifications.creator.lefil.com.br>',
      to: [email],
      subject: 'Redefina sua Senha - Creator IA',
      html: htmlTemplate,
    });

    if (error) {
      console.error('Error sending email:', error);
      throw error;
    }

    console.log('Password reset email sent successfully to:', email);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in send-reset-password-email function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        error: {
          message: errorMessage,
        },
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
