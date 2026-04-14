import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/resend';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');

    if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
      throw new Error('Missing API keys');
    }

    const {
      userName,
      userEmail,
      teamName,
      problemType,
      description,
      screenshotUrls,
      actionId,
      actionType,
    } = await req.json();

    if (!problemType || !description) {
      return new Response(
        JSON.stringify({ error: 'problemType and description are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const problemTypeLabels: Record<string, string> = {
      distorted_image: 'Imagem distorcida',
      incorrect_text: 'Texto incorreto',
      generation_error: 'Erro de geração',
      other: 'Outro',
    };

    const screenshotsHtml = (screenshotUrls && screenshotUrls.length > 0)
      ? `<h3 style="margin-top:20px;">Capturas de tela:</h3>
         ${screenshotUrls.map((url: string, i: number) => 
           `<p><a href="${url}" target="_blank">Screenshot ${i + 1}</a></p>`
         ).join('')}`
      : '';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #e74c3c;">🚨 Novo Report de Problema na Geração</h2>
        <hr style="border: 1px solid #eee; margin: 20px 0;" />
        
        <h3>Informações do Usuário</h3>
        <p><strong>Nome:</strong> ${userName || 'N/A'}</p>
        <p><strong>Email:</strong> ${userEmail || 'N/A'}</p>
        ${teamName ? `<p><strong>Equipe:</strong> ${teamName}</p>` : ''}
        
        <h3 style="margin-top: 20px;">Detalhes do Problema</h3>
        <p><strong>Tipo:</strong> ${problemTypeLabels[problemType] || problemType}</p>
        <p><strong>Descrição:</strong></p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; white-space: pre-wrap;">${description}</div>
        
        ${actionId ? `<p style="margin-top: 15px;"><strong>Action ID:</strong> ${actionId}</p>` : ''}
        ${actionType ? `<p><strong>Tipo de Ação:</strong> ${actionType}</p>` : ''}
        
        ${screenshotsHtml}
        
        <hr style="border: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #888; font-size: 12px;">
          Enviado em: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}
        </p>
      </div>
    `;

    const response = await fetch(`${GATEWAY_URL}/emails`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'X-Connection-Api-Key': RESEND_API_KEY,
      },
      body: JSON.stringify({
        from: 'Creator <onboarding@resend.dev>',
        to: ['suporte.creator@lefil.com.br'],
        subject: `[Report] ${problemTypeLabels[problemType] || problemType} - ${userName || 'Usuário'}`,
        html,
      }),
    });

    const result = await response.json();

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending report email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
