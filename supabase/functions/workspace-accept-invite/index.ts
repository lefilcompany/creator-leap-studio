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

    const { token } = await req.json();
    if (!token) return new Response(JSON.stringify({ error: 'Missing token' }), { status: 400, headers: corsHeaders });

    const admin = createClient(supabaseUrl, supabaseService);

    const { data: invite } = await admin
      .from('workspace_invites')
      .select('*')
      .eq('token', token)
      .maybeSingle();

    if (!invite) return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 404, headers: corsHeaders });
    if (invite.accepted_at) return new Response(JSON.stringify({ error: 'Already accepted' }), { status: 400, headers: corsHeaders });
    if (new Date(invite.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'Expired' }), { status: 400, headers: corsHeaders });
    }

    // Email match (case-insensitive)
    if (user.email?.toLowerCase() !== invite.email.toLowerCase()) {
      return new Response(JSON.stringify({ error: 'Email mismatch. Please log in with ' + invite.email }), {
        status: 403, headers: corsHeaders,
      });
    }

    // Insert membership
    await admin.from('workspace_members').upsert({
      workspace_id: invite.workspace_id,
      user_id: user.id,
      email: user.email,
      role: invite.role,
      status: 'active',
      permissions: invite.permissions,
      monthly_credit_limit: invite.monthly_credit_limit,
      joined_at: new Date().toISOString(),
      invited_by: invite.invited_by,
    }, { onConflict: 'workspace_id,user_id' });

    await admin.from('workspace_invites').update({ accepted_at: new Date().toISOString() }).eq('id', invite.id);

    return new Response(JSON.stringify({ ok: true, workspace_id: invite.workspace_id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
  }
});
