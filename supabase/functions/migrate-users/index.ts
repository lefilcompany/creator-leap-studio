import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CSVUser {
  id: string
  name: string
  email: string
  password: string
  phone?: string
  state?: string
  city?: string
  role: 'ADMIN' | 'MEMBER' | 'WITHOUT_TEAM'
  status: 'ACTIVE' | 'NO_TEAM' | 'PENDING'
  teamId?: string
  tutorialCompleted: string
}

interface CSVTeam {
  id: string
  name: string
  code: string
  displayCode: string
  adminId: string
  plan: string
  credits: string
  totalContents: string
  totalBrands: string
}

interface MigrationResult {
  success: boolean
  usersProcessed: number
  usersCreated: number
  teamsCreated: number
  errors: Array<{ email: string; error: string }>
  warnings: Array<{ email: string; warning: string }>
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    const { csvData, teamsData } = await req.json()

    if (!csvData || !Array.isArray(csvData)) {
      throw new Error('Invalid CSV data format')
    }

    if (!teamsData || !Array.isArray(teamsData)) {
      throw new Error('Invalid teams data format')
    }

    console.log(`Starting migration for ${teamsData.length} teams and ${csvData.length} users`)

    const result: MigrationResult = {
      success: true,
      usersProcessed: 0,
      usersCreated: 0,
      teamsCreated: 0,
      errors: [],
      warnings: []
    }

    // Fase 1: Processar times do CSV de teams
    const teamMap = new Map<string, string>() // oldTeamId -> newTeamUUID
    const adminMap = new Map<string, string>() // oldAdminId -> teamId (para atualizar depois)

    console.log(`Processing ${teamsData.length} teams from CSV`)

    // Criar todos os times primeiro
    for (const team of teamsData as CSVTeam[]) {
      try {
        // Usar displayCode como código do time
        const teamCode = team.displayCode || `TEAM-${team.id.slice(-8).toUpperCase()}`
        
        // Verificar se já existe
        const { data: existingTeam } = await supabaseClient
          .from('teams')
          .select('id')
          .eq('code', teamCode)
          .single()

        if (existingTeam) {
          teamMap.set(team.id, existingTeam.id)
          console.log(`Team ${teamCode} already exists, using existing ID`)
          continue
        }

        // Parse dos créditos do JSON
        let credits = { contentPlans: 10, contentReviews: 20, contentSuggestions: 50 }
        try {
          const parsedCredits = JSON.parse(team.credits)
          credits = {
            contentPlans: parsedCredits.contentPlans || 10,
            contentReviews: parsedCredits.contentReviews || 20,
            contentSuggestions: parsedCredits.contentSuggestions || 50
          }
        } catch (e) {
          console.warn(`Failed to parse credits for team ${team.name}, using defaults`)
        }

        // Criar team temporariamente sem admin_id
        const { data: newTeam, error: teamError } = await supabaseClient
          .from('teams')
          .insert({
            name: team.name,
            code: teamCode,
            admin_id: '00000000-0000-0000-0000-000000000000', // Placeholder
            plan_id: 'free', // Usar plano free por padrão
            credits_quick_content: credits.contentSuggestions,
            credits_suggestions: credits.contentSuggestions,
            credits_plans: credits.contentPlans,
            credits_reviews: credits.contentReviews
          })
          .select()
          .single()

        if (teamError) {
          console.error(`Error creating team ${teamCode}:`, teamError)
          result.warnings.push({
            email: team.name,
            warning: `Failed to create team: ${teamError.message}`
          })
          continue
        }

        teamMap.set(team.id, newTeam.id)
        adminMap.set(team.adminId, newTeam.id) // Guardar para atualizar admin depois
        result.teamsCreated++
        console.log(`Created team ${teamCode} with ID ${newTeam.id}`)
      } catch (error) {
        console.error(`Error processing team ${team.name}:`, error)
        result.warnings.push({
          email: team.name,
          warning: `Failed to process team: ${error instanceof Error ? error.message : 'Unknown error'}`
        })
      }
    }

    // Fase 2: Criar usuários e mapear admins
    const userIdMap = new Map<string, string>() // oldUserId -> newUserUUID
    const tempPassword = 'ChangeMe123!' // Senha temporária

    for (const user of csvData as CSVUser[]) {
      result.usersProcessed++
      
      try {
        // Validar email
        if (!user.email || !user.email.includes('@')) {
          result.errors.push({
            email: user.email || 'invalid',
            error: 'Invalid email format'
          })
          continue
        }

        // Verificar se usuário já existe
        const { data: existingUser } = await supabaseClient
          .from('profiles')
          .select('id')
          .eq('email', user.email)
          .single()

        if (existingUser) {
          result.warnings.push({
            email: user.email,
            warning: 'User already exists, skipping'
          })
          continue
        }

        // Criar usuário no Supabase Auth
        const { data: authUser, error: authError } = await supabaseClient.auth.admin.createUser({
          email: user.email,
          password: tempPassword,
          email_confirm: true, // Confirmar email automaticamente
          user_metadata: {
            name: user.name,
            phone: user.phone,
            state: user.state,
            city: user.city,
            tutorial_completed: user.tutorialCompleted === 'true'
          }
        })

        if (authError) {
          console.error(`Auth error for ${user.email}:`, authError)
          result.errors.push({
            email: user.email,
            error: `Auth creation failed: ${authError.message}`
          })
          continue
        }

        console.log(`Created auth user for ${user.email}`)

        // Guardar mapeamento do ID antigo para o novo
        userIdMap.set(user.id, authUser.user.id)

        // Determinar team_id
        let teamId: string | null = null
        if (user.teamId && teamMap.has(user.teamId)) {
          teamId = teamMap.get(user.teamId)!
        }

        // Criar profile
        const { error: profileError } = await supabaseClient
          .from('profiles')
          .insert({
            id: authUser.user.id,
            email: user.email,
            name: user.name,
            phone: user.phone,
            state: user.state,
            city: user.city,
            team_id: teamId,
            tutorial_completed: user.tutorialCompleted === 'true'
          })

        if (profileError) {
          console.error(`Profile error for ${user.email}:`, profileError)
          result.errors.push({
            email: user.email,
            error: `Profile creation failed: ${profileError.message}`
          })
          continue
        }

        // Criar role se não for WITHOUT_TEAM
        if (user.role !== 'WITHOUT_TEAM') {
          const roleValue = user.role === 'ADMIN' ? 'admin' : 'user'
          
          const { error: roleError } = await supabaseClient
            .from('user_roles')
            .insert({
              user_id: authUser.user.id,
              role: roleValue
            })

          if (roleError) {
            console.error(`Role error for ${user.email}:`, roleError)
            result.warnings.push({
              email: user.email,
              warning: `Role creation failed: ${roleError.message}`
            })
          }
        }

        // Enviar email de reset de senha usando o sistema nativo do Supabase
        const { error: resetError } = await supabaseClient.auth.admin.generateLink({
          type: 'recovery',
          email: user.email,
        })

        if (resetError) {
          console.error(`Failed to send reset email to ${user.email}:`, resetError)
          result.warnings.push({
            email: user.email,
            warning: 'Failed to send password reset email'
          })
        }

        result.usersCreated++
        console.log(`Successfully migrated user ${user.email}`)

      } catch (error) {
        console.error(`Error processing user ${user.email}:`, error)
        result.errors.push({
          email: user.email,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    // Fase 3: Atualizar admin_id dos times com os novos UUIDs
    console.log('Updating team admins...')
    for (const [oldAdminId, teamId] of adminMap) {
      if (userIdMap.has(oldAdminId)) {
        const newAdminUUID = userIdMap.get(oldAdminId)!
        
        const { error: updateError } = await supabaseClient
          .from('teams')
          .update({ admin_id: newAdminUUID })
          .eq('id', teamId)

        if (updateError) {
          console.error(`Failed to update admin for team ${teamId}:`, updateError)
          result.warnings.push({
            email: 'system',
            warning: `Failed to update admin for team: ${updateError.message}`
          })
        } else {
          console.log(`Updated admin for team ${teamId}`)
        }
      }
    }

    console.log('Migration completed:', result)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Migration error:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
