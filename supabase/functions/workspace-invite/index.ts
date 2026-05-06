import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';
import { corsHeaders } from 'https://esm.sh/@supabase/supabase-js@2.95.0/cors';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseService = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

    const { workspace_id, email, role = 'member', permissions = {}, monthly_credit_limit = null } = await req.json();
    if (!workspace_id || !email) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400, headers: corsHeaders });
    }

    const admin = createClient(supabaseUrl, supabaseService);

    // Verify owner
    const { data: ws } = await admin.from('workspaces').select('id, name, owner_id').eq('id', workspace_id).maybeSingle();
    if (!ws || ws.owner_id !== user.id) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders });
    }

    // Create invite
    const { data: invite, error: invErr } = await admin
      .from('workspace_invites')
      .insert({
        workspace_id,
        email: email.toLowerCase(),
        role,
        permissions,
        monthly_credit_limit,
        invited_by: user.id,
      })
      .select()
      .single();
    if (invErr) throw invErr;

    // Get inviter name
    const { data: inviter } = await admin.from('profiles').select('name').eq('id', user.id).maybeSingle();

    // Send email via Resend
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    const acceptUrl = `https://pla.creator.lefil.com.br/invite/${invite.token}`;
    if (RESEND_API_KEY) {
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${RESEND_API_KEY}` },
          body: JSON.stringify({
            from: 'Creator <noreply@creator.lefil.com.br>',
            to: [email],
            subject: `Você foi convidado para o workspace ${ws.name}`,
            html: `
              <div style="font-family: -apple-system, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px;">
                <h1 style="color:#111;">Convite para workspace</h1>
                <p>${inviter?.name || 'Alguém'} te convidou para entrar no workspace <strong>${ws.name}</strong> no Creator.</p>
                <p style="margin: 24px 0;">
                  <a href="${acceptUrl}" style="background:#6366f1;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">Aceitar convite</a>
                </p>
                <p style="color:#666;font-size:13px;">Este convite expira em 7 dias.</p>
              </div>
            `,
          }),
        });
      } catch (e) {
        console.error('Email send failed', e);
      }
    }

    return new Response(JSON.stringify({ ok: true, invite_id: invite.id, accept_url: acceptUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
});
