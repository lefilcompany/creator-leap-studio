import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // 1. Validate JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Não autorizado' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // 2. Verify caller identity
    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getUser()
    if (claimsError || !claimsData?.user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Token inválido' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const callerId = claimsData.user.id

    // 3. Verify caller has 'system' role
    const { data: hasSystemRole, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('id')
      .eq('user_id', callerId)
      .eq('role', 'system')
      .maybeSingle()

    if (roleError || !hasSystemRole) {
      return new Response(
        JSON.stringify({ success: false, error: 'Acesso negado: permissão de administrador necessária' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    const { email, newPassword, userId } = await req.json()

    if (!newPassword) {
      throw new Error('newPassword is required')
    }

    if (!email && !userId) {
      throw new Error('email or userId is required')
    }

    let targetUserId = userId

    if (!targetUserId && email) {
      console.log(`System admin ${callerId} looking up user by email`)
      const { data: users, error: getUserError } = await supabaseAdmin.auth.admin.listUsers()
      
      if (getUserError) {
        throw getUserError
      }

      const user = users.users.find(u => u.email === email)
      
      if (!user) {
        throw new Error('User not found')
      }
      
      targetUserId = user.id
    }

    console.log(`System admin ${callerId} resetting password for userId: ${targetUserId}`)

    const { data, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUserId,
      { password: newPassword }
    )

    if (updateError) {
      throw updateError
    }

    console.log(`Password reset successfully by admin ${callerId} for userId: ${targetUserId}`)

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Password reset successfully',
        userId: targetUserId 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error resetting password:', errorMessage)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: errorMessage
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    )
  }
})
