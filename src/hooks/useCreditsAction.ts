import { useAuth } from './useAuth';
import { CREDIT_COSTS } from '@/lib/creditCosts';
import { toast } from 'sonner';

interface ExecuteActionOptions {
  showCreditUpdate?: boolean;
  onSuccess?: () => void;
}

export function useCreditsAction() {
  const { team, refreshTeamCredits } = useAuth();

  const executeAction = async <T>(
    actionFn: () => Promise<T>,
    actionType: keyof typeof CREDIT_COSTS,
    options?: ExecuteActionOptions
  ): Promise<T | null> => {
    // Verificar créditos antes
    if (!team || team.credits < CREDIT_COSTS[actionType]) {
      toast.error('Créditos insuficientes', {
        description: `Esta ação requer ${CREDIT_COSTS[actionType]} créditos.`
      });
      return null;
    }

    try {
      // Executar ação
      const result = await actionFn();
      
      // Atualizar créditos
      await refreshTeamCredits();
      
      // Feedback opcional
      if (options?.showCreditUpdate && team) {
        const newCredits = team.credits - CREDIT_COSTS[actionType];
        toast.info(`Créditos atualizados`, {
          description: `${newCredits} créditos restantes`,
          duration: 2000
        });
      }
      
      options?.onSuccess?.();
      return result;
      
    } catch (error) {
      throw error;
    }
  };

  return { 
    executeAction, 
    currentCredits: team?.credits || 0 
  };
}
