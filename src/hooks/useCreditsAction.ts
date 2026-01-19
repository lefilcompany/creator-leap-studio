import { useAuth } from './useAuth';
import { CREDIT_COSTS } from '@/lib/creditCosts';
import { toast } from 'sonner';

interface ExecuteActionOptions {
  showCreditUpdate?: boolean;
  onSuccess?: () => void;
}

export function useCreditsAction() {
  const { user, refreshUserCredits } = useAuth();

  const executeAction = async <T>(
    actionFn: () => Promise<T>,
    actionType: keyof typeof CREDIT_COSTS,
    options?: ExecuteActionOptions
  ): Promise<T | null> => {
    // Verificar créditos antes (usa créditos individuais do usuário)
    const userCredits = user?.credits || 0;
    if (!user || userCredits < CREDIT_COSTS[actionType]) {
      toast.error('Créditos insuficientes', {
        description: `Esta ação requer ${CREDIT_COSTS[actionType]} créditos. Você tem ${userCredits}.`
      });
      return null;
    }

    try {
      // Executar ação
      const result = await actionFn();
      
      // Atualizar créditos do usuário
      await refreshUserCredits();
      
      // Feedback opcional
      if (options?.showCreditUpdate && user) {
        const newCredits = userCredits - CREDIT_COSTS[actionType];
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
    currentCredits: user?.credits || 0 
  };
}
