import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

/**
 * Hook para integração com RD Station
 * 
 * IMPORTANTE: Todos os eventos enviados incluem automaticamente:
 * - cf_origem: "Creator" (identifica a plataforma)
 * - cf_produto: "Creator Platform" (identifica o produto)
 * 
 * Esses campos são adicionados pela Edge Function e permitem
 * filtrar todos os leads do Creator no RD Station através da
 * segmentação: cf_origem = "Creator"
 */

interface RDStationUserData {
  email: string;
  name?: string;
  phone?: string;
  city?: string;
  state?: string;
  teamName?: string;
  plan?: string;
  userRole?: string;
  actionType?: string;
  creditsRemaining?: number;
  tags?: string[];
}

export const useRDStation = () => {
  const { user, team } = useAuth();

  const sendToRDStation = async (eventType: string, customData?: Partial<RDStationUserData>) => {
    if (!user) {
      console.warn("Usuário não autenticado - não enviando evento para RD Station");
      return;
    }

    try {
      // Buscar dados do perfil
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      const userData: RDStationUserData = {
        email: user.email,
        name: profile?.name || user.name,
        phone: profile?.phone,
        city: profile?.city,
        state: profile?.state,
        teamName: team?.name,
        plan: team?.plan?.name,
        userRole: user.isAdmin ? 'admin' : 'member',
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

    // Evento: Créditos baixos
    trackCreditsLow: (creditsRemaining: number) => {
      return sendToRDStation('credits_low', {
        creditsRemaining,
        tags: ['creditos_baixos', 'upsell_opportunity']
      });
    },

    // Método genérico para eventos customizados
    trackCustomEvent: (eventType: string, customData?: Partial<RDStationUserData>) => {
      return sendToRDStation(eventType, customData);
    }
  };
};
