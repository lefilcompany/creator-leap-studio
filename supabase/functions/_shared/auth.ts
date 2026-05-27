import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.2';

/**
 * Verifies the request bears a valid JWT.
 * Returns { userId } on success, or a Response (401) to return directly on failure.
 */
export async function requireAuth(
  req: Request,
  corsHeaders: Record<string, string>,
): Promise<{ userId: string; token: string } | Response> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  const token = authHeader.replace('Bearer ', '');
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
  );
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  return { userId: data.user.id, token };
}

/**
 * Verifies the caller is an authenticated system admin (user_roles.role = 'system').
 */
export async function requireSystemAdmin(
  req: Request,
  corsHeaders: Record<string, string>,
): Promise<{ userId: string } | Response> {
  const auth = await requireAuth(req, corsHeaders);
  if (auth instanceof Response) return auth;

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const { data, error } = await admin
    .from('user_roles')
    .select('role')
    .eq('user_id', auth.userId)
    .eq('role', 'system')
    .maybeSingle();
  if (error || !data) {
    return new Response(JSON.stringify({ error: 'Forbidden: system admin only' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
  return { userId: auth.userId };
}

export function escapeHtml(str: unknown): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
