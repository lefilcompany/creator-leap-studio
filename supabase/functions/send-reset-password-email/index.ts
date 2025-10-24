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

// Template de email de recuperação de senha
function getPasswordResetEmailTemplate(resetUrl: string): string {
  const logoUrl = 'https://pla.creator.lefil.com.br/logoCreatorPreta.png';
  
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recuperação de Senha - Creator AI</title>
  <style>
    body {
      background: linear-gradient(120deg, hsl(288,80%,98%) 0%, hsl(0,0%,100%) 100%);
      color: hsl(228,21%,17%);
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      min-height: 100vh;
    }
    .container {
      max-width: 480px;
      margin: 40px auto;
      background: #fff;
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(69, 36, 104, 0.10);
      overflow: hidden;
      border: 1.5px solid rgba(116, 69, 196, 0.10);
    }
    .header {
      background: linear-gradient(90deg, hsl(330,100%,38%) 0%, hsl(269,66%,48%) 100%);
      color: #fff;
      padding: 32px 24px 18px 24px;
      text-align: center;
    }
    .logo {
      max-width: 140px;
      margin-bottom: 18px;
      filter: drop-shadow(0 2px 8px rgba(255,255,255,0.10));
    }
    .header h1 {
      margin: 0;
      font-size: 1.7rem;
      font-weight: 700;
      letter-spacing: -0.5px;
    }
    .content {
      padding: 36px 28px 28px 28px;
    }
    .content h2 {
      color: hsl(228,21%,17%);
      font-size: 1.25rem;
      font-weight: 600;
      margin-bottom: 18px;
    }
    .content p {
      color: hsl(0,0%,48%);
      font-size: 1rem;
      margin-bottom: 18px;
      line-height: 1.7;
    }
    .button-container {
      text-align: center;
      margin: 32px 0 24px 0;
    }
    .reset-button {
      display: inline-block;
      background: linear-gradient(90deg, hsl(330,100%,38%) 0%, hsl(269,66%,48%) 100%);
      color: #fff !important;
      text-decoration: none;
      padding: 15px 38px;
      border-radius: 999px;
      font-weight: 700;
      font-size: 1.08rem;
      letter-spacing: 0.01em;
      box-shadow: 0 4px 16px rgba(194, 22, 96, 0.25);
      transition: all 0.2s ease;
    }
    .reset-button:hover {
      background: linear-gradient(90deg, hsl(269,66%,48%) 0%, hsl(330,100%,38%) 100%);
      box-shadow: 0 6px 24px rgba(194, 22, 96, 0.35);
      transform: translateY(-1px);
    }
    .warning {
      background: #fff3cd;
      border-left: 4px solid #ffeaa7;
      padding: 13px 18px;
      margin: 22px 0 18px 0;
      color: #856404;
      border-radius: 8px;
      font-size: 0.98rem;
    }
    .url-fallback {
      margin-top: 18px;
      padding: 13px 14px;
      background: hsl(0,0%,96%);
      border-radius: 7px;
      font-size: 0.93rem;
      word-break: break-all;
      color: #666;
      border: 1px solid hsl(0,0%,90%);
    }
    .footer {
      background: linear-gradient(135deg, rgba(194, 22, 96, 0.03) 0%, rgba(116, 69, 196, 0.03) 100%);
      padding: 22px 18px;
      text-align: center;
    }
    .footer p {
      margin: 0;
      color: hsl(0,0%,48%);
      font-size: 0.97rem;
    }
    .footer strong {
      background: linear-gradient(135deg, #C21660 0%, #7445C4 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    @media (max-width: 600px) {
      .container { margin: 0 0 24px 0; border-radius: 0; }
      .content { padding: 24px 8vw 18px 8vw; }
      .header { padding: 24px 8vw 12px 8vw; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="${logoUrl}" alt="Logo Creator AI" class="logo">
      <h1>Recuperação de Senha</h1>
    </div>
    <div class="content">
      <h2>Olá!</h2>
      <p>Recebemos uma solicitação para redefinir a senha da sua conta na plataforma <strong>Creator AI</strong>.</p>
      <p>Para criar uma nova senha, clique no botão abaixo. Este link é seguro e exclusivo para você.</p>
      <div class="button-container">
        <a href="${resetUrl}" class="reset-button">Redefinir Minha Senha</a>
      </div>
      <div class="warning">
        <strong>⚠️ Atenção:</strong> Este link expirará em breve e só pode ser usado uma vez por motivos de segurança.
      </div>
      <p>Se o botão não funcionar, copie e cole o seguinte link no seu navegador:</p>
      <div class="url-fallback">${resetUrl}</div>
      <p style="margin-top: 24px; font-size: 0.95rem;">Caso você não tenha solicitado esta redefinição, pode ignorar este e-mail com segurança. Sua senha permanecerá inalterada.</p>
    </div>
    <div class="footer">
      <p><strong>Creator IA</strong></p>
      <p style="font-size: 0.85rem; margin-top: 10px; color: hsl(0,0%,60%);">© ${new Date().getFullYear()} Creator IA. Todos os direitos reservados.</p>
    </div>
  </div>
</body>
</html>
  `;
}

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

    // Detectar o domínio de origem da requisição
    const origin = req.headers.get('origin') || req.headers.get('referer') || '';
    let appUrl = 'https://pla.creator.lefil.com.br'; // Fallback para domínio principal
    
    // Extrair domínio base do origin/referer
    if (origin) {
      try {
        const url = new URL(origin);
        appUrl = `${url.protocol}//${url.host}`;
      } catch (e) {
        console.log('Could not parse origin, using default domain');
      }
    }
    
    console.log('Using app URL for redirect:', appUrl);
    const redirectUrl = `${appUrl}/reset-password`;
    
    const { data, error: resetError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: redirectUrl,
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
    console.log('Redirect URL:', redirectUrl);

    // Usar o template de email TypeScript
    const htmlTemplate = getPasswordResetEmailTemplate(confirmationUrl);

    const { error } = await resend.emails.send({
      from: 'Creator AI <send@notifications.creator.lefil.com.br>',
      to: [email],
      subject: 'Redefina sua Senha - Creator AI',
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
