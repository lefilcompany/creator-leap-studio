import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get('RESEND_API_KEY') as string);
const hookSecret = Deno.env.get('SEND_EMAIL_HOOK_SECRET') as string;

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('not allowed', { status: 400 });
  }

  const payload = await req.text();
  const headers = Object.fromEntries(req.headers);
  const wh = new Webhook(hookSecret);
  
  try {
    const {
      user,
      email_data: { token, token_hash, redirect_to, email_action_type },
    } = wh.verify(payload, headers) as {
      user: {
        email: string;
      };
      email_data: {
        token: string;
        token_hash: string;
        redirect_to: string;
        email_action_type: string;
        site_url: string;
      };
    };

    // Only handle password recovery emails
    if (email_action_type !== 'recovery') {
      return new Response(JSON.stringify({ message: 'Not a recovery email' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const siteUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const confirmationUrl = `${siteUrl}/auth/v1/verify?token=${token_hash}&type=recovery&redirect_to=${redirect_to}`;

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
      from: 'Equipe Creator <suporte@creator.lefil.com.br>',
      to: [user.email],
      subject: 'Redefina sua Senha - Creator Leap Studio',
      html: htmlTemplate,
    });

    if (error) {
      console.error('Error sending email:', error);
      throw error;
    }

    console.log('Password reset email sent successfully to:', user.email);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
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
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
