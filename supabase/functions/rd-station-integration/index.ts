import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RDStationEvent {
  event_type: string;
  event_family?: string;
  payload: {
    conversion_identifier: string;
    email: string;
    name?: string;
    mobile_phone?: string;
    personal_phone?: string;
    city?: string;
    state?: string;
    tags?: string[];
    available_for_mailing?: boolean;
    cf_team_name?: string;
    cf_plan?: string;
    cf_user_role?: string;
    cf_action_type?: string;
    cf_credits_remaining?: number;
    cf_origem?: string;
    cf_produto?: string;
    cf_subscription_status?: string;
    cf_credits_quick_content?: number;
    cf_credits_suggestions?: number;
    cf_credits_plans?: number;
    cf_credits_reviews?: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rdApiKey = Deno.env.get('RD_STATION_API_KEY');
    
    if (!rdApiKey) {
      console.error('RD_STATION_API_KEY não configurada');
      return new Response(
        JSON.stringify({ error: 'RD Station API key não configurada' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { eventType, userData } = await req.json();

    console.log('Recebendo evento RD Station:', { eventType, email: userData.email, origem: 'Creator' });

    // Mapear tipo de evento
    const eventMap: Record<string, string> = {
      'user_registered': 'CONVERSION',
      'team_created': 'CONVERSION',
      'content_generated': 'CONVERSION',
      'content_approved': 'CONVERSION',
      'credits_low': 'CONVERSION',
      'trial_expired': 'CONVERSION',
      'credits_depleted_quick_content': 'CONVERSION',
      'credits_depleted_suggestions': 'CONVERSION',
      'credits_depleted_plans': 'CONVERSION',
      'credits_depleted_reviews': 'CONVERSION',
    };

    const rdEvent: RDStationEvent = {
      event_type: eventMap[eventType] || 'CONVERSION',
      event_family: 'CDP',
      payload: {
        conversion_identifier: eventType,
        email: userData.email,
        name: userData.name,
        mobile_phone: userData.phone,
        city: userData.city,
        state: userData.state,
        available_for_mailing: true,
        tags: userData.tags || [],
        cf_origem: 'Creator',
        cf_produto: 'Creator Platform',
        ...(userData.teamName && { cf_team_name: userData.teamName }),
        ...(userData.plan && { cf_plan: userData.plan }),
        ...(userData.userRole && { cf_user_role: userData.userRole }),
        ...(userData.actionType && { cf_action_type: userData.actionType }),
        ...(userData.creditsRemaining !== undefined && { cf_credits_remaining: userData.creditsRemaining }),
        ...(userData.subscriptionStatus && { cf_subscription_status: userData.subscriptionStatus }),
        ...(userData.creditsQuickContent !== undefined && { cf_credits_quick_content: userData.creditsQuickContent }),
        ...(userData.creditsSuggestions !== undefined && { cf_credits_suggestions: userData.creditsSuggestions }),
        ...(userData.creditsPlans !== undefined && { cf_credits_plans: userData.creditsPlans }),
        ...(userData.creditsReviews !== undefined && { cf_credits_reviews: userData.creditsReviews }),
      }
    };

    console.log('Enviando para RD Station:', {
      ...rdEvent,
      campos_origem: {
        cf_origem: rdEvent.payload.cf_origem,
        cf_produto: rdEvent.payload.cf_produto
      }
    });

    const response = await fetch('https://api.rd.services/platform/conversions?api_key=' + rdApiKey, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(rdEvent)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro na resposta do RD Station:', response.status, errorText);
      throw new Error(`RD Station API error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('Sucesso no envio para RD Station:', result);

    return new Response(
      JSON.stringify({ success: true, result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro no rd-station-integration:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Erro desconhecido',
        details: error
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
