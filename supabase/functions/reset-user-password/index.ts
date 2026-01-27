import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
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

    const { email, newPassword, userId } = await req.json()

    if (!newPassword) {
      throw new Error('newPassword is required')
    }

    if (!email && !userId) {
      throw new Error('email or userId is required')
    }

    let targetUserId = userId

    // Se não tiver userId, buscar pelo email
    if (!targetUserId && email) {
      console.log(`Looking up user by email: ${email}`)
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

    console.log(`Resetting password for userId: ${targetUserId}`)

    // Update user password directly by ID
    const { data, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUserId,
      { password: newPassword }
    )

    if (updateError) {
      throw updateError
    }

    console.log(`Password reset successfully for userId: ${targetUserId}`)

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
