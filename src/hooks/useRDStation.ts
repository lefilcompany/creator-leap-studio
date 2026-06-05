import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

/**
 * Hook para integração com RD Station
 * 
 * IMPORTANTE: Todos os eventos enviados incluem automaticamente:
 * - cf_origem: "Creator" (identifica a plataforma)
 * - cf_produto: "Creator Platform" (identifica o produto)
 * - cf_subscription_status: Status da assinatura (trialing, active, expired)
 * - cf_credits_*: Créditos por tipo de ação
 * 
 * Esses campos são adicionados pela Edge Function e permitem
 * filtrar todos os leads do Creator no RD Station através da
 * segmentação: cf_origem = "Creator"
 * 
 * Eventos especiais:
 * - trial_expired: Quando o período de trial grátis expira
 * - credits_depleted_*: Quando créditos específicos zeram
 * - credits_low: Quando créditos ficam baixos (threshold: 10)
 */

interface RDStationUserData {
  email: string;
  name?: string;
  phone?: string;
  city?: string;
  state?: string;
  teamName?: string;
  plan?: string;
  credits?: number;
  userRole?: string;
  actionType?: string;
  creditsRemaining?: number;
  tags?: string[];
  subscriptionStatus?: string;
  creditsQuickContent?: number;
  creditsSuggestions?: number;
  creditsPlans?: number;
  creditsReviews?: number;
}

export const useRDStation = () => {
  const { user, team } = useAuth();

  const sendToRDStation = async (eventType: string, customData?: Partial<RDStationUserData>) => {
    if (!user) {
      console.warn("Usuário não autenticado - não enviando evento para RD Station");
      return;
    }

    try {
      // Buscar dados do perfil e team completo
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const { data: teamData } = await supabase
        .from('teams')
        .select('*, plans(*)')
        .eq('id', team?.id)
        .single();

      const userData: RDStationUserData = {
        email: user.email,
        name: profile?.name || user.name,
        phone: profile?.phone,
        city: profile?.city,
        state: profile?.state,
        teamName: teamData?.name,
        plan: teamData?.plans?.name,
        userRole: user.isAdmin ? 'admin' : 'member',
        subscriptionStatus: teamData?.subscription_status,
        credits: (teamData as any).credits || 0,
        ...customData
      };

      console.log('Enviando evento para RD Station:', eventType, userData);

      const { data, error } = await supabase.functions.invoke('rd-station-integration', {
        body: {
          eventType,
          userData
        }
      });

      if (error) {
        console.error('Erro ao enviar evento para RD Station:', error);
        return;
      }

      console.log('Evento enviado com sucesso para RD Station:', data);
      return data;
    } catch (error) {
      console.error('Erro ao processar evento RD Station:', error);
    }
  };

  return {
    // Evento: Novo usuário registrado
    trackUserRegistration: () => {
      return sendToRDStation('user_registered', {
        tags: ['novo_usuario', 'criador_conta']
      });
    },

    // Evento: Time criado
    trackTeamCreated: (teamName: string) => {
      return sendToRDStation('team_created', {
        teamName,
        tags: ['time_criado', 'admin']
      });
    },

    // Evento: Primeira geração de conteúdo
    trackFirstContentGeneration: (actionType: string) => {
      return sendToRDStation('content_generated', {
        actionType,
        tags: ['primeiro_conteudo', 'engajado']
      });
    },

    // Evento: Conteúdo aprovado
    trackContentApproved: (actionType: string) => {
      return sendToRDStation('content_approved', {
        actionType,
        tags: ['conteudo_aprovado', 'usuario_ativo']
      });
    },

    // Evento: Créditos baixos (geral)
    trackCreditsLow: (creditsRemaining: number) => {
      return sendToRDStation('credits_low', {
        creditsRemaining,
        tags: ['creditos_baixos', 'upsell_opportunity']
      });
    },

    // Evento: Trial expirado
    trackTrialExpired: () => {
      return sendToRDStation('trial_expired', {
        tags: ['trial_expirado', 'conversao_urgente', 'plano_gratis_acabou']
      });
    },

    // Evento: Créditos de Conteúdo Rápido esgotados
    trackCreditsDepletedQuickContent: () => {
      return sendToRDStation('credits_depleted_quick_content', {
        tags: ['creditos_zerados', 'conteudo_rapido', 'upgrade_necessario']
      });
    },

    // Evento: Créditos de Sugestões esgotados
    trackCreditsDepletedSuggestions: () => {
      return sendToRDStation('credits_depleted_suggestions', {
        tags: ['creditos_zerados', 'sugestoes', 'upgrade_necessario']
      });
    },

    // Evento: Créditos de Planejamento esgotados
    trackCreditsDepletedPlans: () => {
      return sendToRDStation('credits_depleted_plans', {
        tags: ['creditos_zerados', 'planejamento', 'upgrade_necessario']
      });
    },

    // Evento: Créditos de Revisões esgotados
    trackCreditsDepletedReviews: () => {
      return sendToRDStation('credits_depleted_reviews', {
        tags: ['creditos_zerados', 'revisoes', 'upgrade_necessario']
      });
    },

    // Método genérico para eventos customizados
    trackCustomEvent: (eventType: string, customData?: Partial<RDStationUserData>) => {
      return sendToRDStation(eventType, customData);
    }
  };
};
