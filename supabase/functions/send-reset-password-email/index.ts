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
  <title>Redefina sua Senha - Creator Leap Studio</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F3F4F6; font-family: Arial, Helvetica, sans-serif;">
  <!-- Wrapper Table -->
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F3F4F6; min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        
        <!-- Main Card Table -->
        <table width="600" border="0" cellspacing="0" cellpadding="0" style="background-color: #FFFFFF; border-radius: 8px; max-width: 600px; width: 100%;">
          
          <!-- Logo Row -->
          <tr>
            <td align="center" style="padding: 40px 30px 20px 30px;">
              <img src="https://afxwqkrneraatgovhpkb.supabase.co/storage/v1/object/public/content-images/logoCreatorPreta.png" alt="Creator Leap Studio" width="150" style="display: block; max-width: 150px; height: auto; border: 0;">
            </td>
          </tr>
          
          <!-- Title Row -->
          <tr>
            <td align="center" style="padding: 0 30px 20px 30px;">
              <h1 style="margin: 0; font-size: 24px; font-weight: bold; color: #374151; font-family: Arial, Helvetica, sans-serif;">Redefina sua Senha</h1>
            </td>
          </tr>
          
          <!-- Body Text Row -->
          <tr>
            <td style="padding: 0 30px 30px 30px;">
              <p style="margin: 0 0 20px 0; font-size: 16px; color: #374151; line-height: 1.5; font-family: Arial, Helvetica, sans-serif;">
                Olá, recebemos uma solicitação para redefinir a senha da sua conta. Clique no botão abaixo para escolher uma nova senha:
              </p>
            </td>
          </tr>
          
          <!-- Button Row -->
          <tr>
            <td align="center" style="padding: 0 30px 30px 30px;">
              <!-- Button as Table for maximum compatibility -->
              <table border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="background-color: #6366F1; border-radius: 8px;">
                    <a href="${confirmationUrl}" target="_blank" style="display: inline-block; padding: 12px 24px; font-size: 16px; color: #FFFFFF; text-decoration: none; font-weight: bold; font-family: Arial, Helvetica, sans-serif;">
                      Redefinir Senha
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Alternative Link Row -->
          <tr>
            <td style="padding: 0 30px 20px 30px;">
              <p style="margin: 0 0 10px 0; font-size: 14px; color: #374151; line-height: 1.5; font-family: Arial, Helvetica, sans-serif;">
                Se o botão não funcionar, copie e cole este link no seu navegador:
              </p>
              <p style="margin: 0; font-size: 12px; color: #6366F1; line-height: 1.5; word-break: break-all; font-family: Arial, Helvetica, sans-serif;">
                ${confirmationUrl}
              </p>
            </td>
          </tr>
          
          <!-- Footer Row -->
          <tr>
            <td style="padding: 0 30px 40px 30px;">
              <p style="margin: 0; font-size: 14px; color: #6B7280; line-height: 1.5; font-family: Arial, Helvetica, sans-serif;">
                Se você não solicitou isso, pode ignorar este e-mail.
              </p>
            </td>
          </tr>
          
          <!-- Bottom Footer -->
          <tr>
            <td align="center" style="padding: 20px 30px; background-color: #F9FAFB; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px;">
              <p style="margin: 0 0 5px 0; font-size: 14px; color: #374151; font-weight: bold; font-family: Arial, Helvetica, sans-serif;">
                Creator Leap Studio
              </p>
              <p style="margin: 0; font-size: 12px; color: #6B7280; font-family: Arial, Helvetica, sans-serif;">
                © 2025 Creator Leap Studio. Todos os direitos reservados.
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
      from: 'Creator Leap Studio <send@notifications.creator.lefil.com.br>',
      to: [email],
      subject: 'Redefina sua Senha - Creator Leap Studio',
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
